# ADR 003: Temporary Connected Waypoint Navigation

## Status

Accepted

## Context

The movement system uses waypoint-based navigation to support several goals:

- simpler wandering by choosing among adjacent waypoint destinations
- reliable movement toward room exits
- one-character-per-waypoint occupancy rules for clearer character placement

Waypoints are needed while level loading schedules itinerary movement, but are not needed by the runtime game after scheduling. Keeping them in runtime `Room` or `Level` data would also introduce cyclic adjacency into data intended for later JSON serialization and caching.

The earlier version of this ADR chose room-local graphs, explicit room transitions, and precomputed `Waypoint.exitDirections`. That design duplicated pathfinding state for every exit.

## Decision

We adopt one temporary connected waypoint graph spanning all rooms during level loading.

### 1. Characters are always on a waypoint or traveling to a waypoint

Character placement and room-local wandering are waypoint-based.

The intended steady-state invariant is:

- a character rests on a waypoint
- movement events travel from one waypoint to another waypoint

### 2. Every waypoint has room ownership

Every waypoint has a normalized `roomId`. Waypoint identity includes its owning room as well as its canonical `(x,y,z)` position.

Generation still uses a room-local `(x,y,z)` map to deduplicate nodes within one room. Nodes are never globally deduplicated by position.

### 3. Each room gets its own waypoint for every shared exit

For an exit shared by two rooms, each room receives its own exit-associated waypoint. The two nodes remain distinct objects with different `roomId` values even when their canonical positions are equal.

No waypoint member is added to `RoomExit` itself.

### 4. Shared exits connect the graph across rooms

After all room-local graphs are generated, the two room-specific nodes for every shared exit receive a bidirectional adjacency edge. Generation asserts that both nodes exist, are distinct objects, and belong to the expected rooms.

The cross-room edge may have zero geometric length when both sides use the same canonical exit position. Such an edge changes graph ownership without creating a duplicate-time walk keyframe.

### 5. Cross-room routes use unweighted breadth-first search

Movement between rooms runs one breadth-first search over waypoint adjacency, starting at the nearest valid waypoint in the source room and ending at the nearest valid waypoint in the destination room. Every graph edge has equal search cost.

Visited nodes and predecessor links use waypoint object identity. They must not use position alone because opposite sides of an exit can coincide.

Neighbor traversal is deterministic. After search reaches any waypoint in the destination room, it does not enqueue neighbors outside that room; all waypoints within a room are expected to be mutually reachable.

After selecting a path, existing path simplification and geometric walk-duration calculations apply. Therefore BFS minimizes edge count, not physical travel time, and may occasionally choose a geometrically slower route.

### 6. Waypoints have a temporary loading lifetime

`WaypointGenerationContext` owns the global waypoint list and a room-indexed waypoint map. Room loading creates the context, activity scheduling consumes it, and `loadLevelFromText()` discards it before returning the finished `Level`.

Neither runtime `Room` nor runtime `Level` retains waypoints. `StairFlight` data has the same loading-only lifetime: each room generates its flights once and uses them to generate both runtime `StairPart` data and temporary waypoints. Only `StairPart` remains on `Room`.

### 7. Canonical coordinates remain required

Waypoint identity and local deduplication use exact canonical `(x,y,z)` coordinates. Floor, exit, and stair-landing Y coordinates continue to follow ADR 012.

## Rationale

This design keeps pathfinding simple while making multi-room routing reliable:

- wandering can choose adjacent waypoints directly
- occupancy is easier to reason about when characters rest only on waypoints
- one graph search handles adjacent and multi-room movement uniformly
- no per-exit flood-fill state is generated or retained
- temporary cyclic graph data does not complicate runtime serialization
- unweighted BFS is predictable and sufficient despite not minimizing geometric distance

## Consequences

### Positive

- Simpler room-local wandering logic
- Stronger basis for one-character-per-waypoint occupancy rules
- Clearer movement invariants than arbitrary point-in-room targets
- Reliable traversal across chains of rooms
- Less generated routing state
- Runtime `Room` and `Level` remain free of waypoint graph data

### Negative

- BFS can choose a geometrically slower route with fewer or equally many edges
- Some geometrically possible paths may still be unavailable in complex obstruction layouts
- The graph must be regenerated whenever a level is loaded rather than restored from runtime `Level` data

## Implementation Notes

Implementation should proceed roughly as follows:

1. Generate stair flights once per room.
2. Generate each room's local waypoint graph and runtime stair parts from those flights.
3. Add waypoints to `WaypointGenerationContext` and index them by `roomId`.
4. Connect the two distinct nodes at every shared exit.
5. Pass the context through itinerary activity scheduling.
6. Use room-indexed lookups for local movement and global BFS for cross-room movement.
7. Discard the context before returning the runtime `Level`.

## Not Chosen

### Precomputed `Waypoint.exitDirections`

Superseded because it duplicates a flood fill for every exit and does not reliably compose into routes through multiple rooms.

### Weighted shortest-path search

Not chosen. Dijkstra or A* could optimize geometric travel time, but the additional complexity is not currently justified. Geometric distance still determines movement duration after BFS selects a route.

### Retaining waypoints on `Room` or `Level`

Not chosen because waypoints are scheduling-only data and cyclic adjacency would interfere with JSON serialization and caching.

### `RoomExit.waypoint`

Not chosen.

Reason:

- each shared exit needs a distinct room-owned waypoint per side
- a single waypoint on `RoomExit` would be ambiguous
- side-specific waypoint generation belongs to room navigation, not the exit record itself
