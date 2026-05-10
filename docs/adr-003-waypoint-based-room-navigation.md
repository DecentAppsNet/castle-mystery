# ADR 003: Waypoint-Based Room Navigation

## Status

Accepted

## Context

The movement system is being migrated toward waypoint-based navigation to support several goals:

- simpler wandering by choosing among adjacent waypoint destinations
- reliable movement toward room exits
- one-character-per-waypoint occupancy rules for clearer character placement

At the same time, the design does not need to support all theoretically traversable maze-like layouts, and level-authored room obstructions are static after level load.

## Decision

We adopt waypoint-based room navigation with room-local exit handling.

### 1. Characters are always on a waypoint or traveling to a waypoint

Character placement and room-local wandering are waypoint-based.

The intended steady-state invariant is:

- a character rests on a waypoint
- movement events travel from one waypoint to another waypoint

### 2. Each room gets its own inset exit waypoint for each connected exit

For a room exit shared by two rooms, each room receives its own exit-associated waypoint inset from the exit center by a fixed spacing.

Example:

- shared exit center at `(40, 50)` on a vertical wall
- inset spacing `3`
- Room A gets waypoint `(37, 50)`
- Room B gets waypoint `(43, 50)`

No waypoint member is added to `RoomExit` itself.

### 3. Exit traversal remains explicit, not graph-adjacent across rooms

The two inset exit waypoints on opposite sides of a shared exit are **not** treated as directly adjacent in the waypoint graph for now.

Cross-room traversal is handled explicitly by movement logic.

This preserves clear room-transition semantics and avoids folding room-entry behavior into a single generic graph edge too early.

### 4. `Waypoint.adjacentExits` is removed

Room-local navigation is expressed only through waypoint-to-waypoint adjacency.

Exit-associated waypoints are part of the room's waypoint set, and normal adjacency among waypoints is used inside the room.

### 5. `Waypoint.exitDirections` is precomputed for adjacent room ids only

Each waypoint stores a mapping from adjacent room id to the next adjacent waypoint that most efficiently progresses toward that exit.

The type should be a plain object form such as:

- `Partial<Record<string, Waypoint>>`

For now, keys are limited to **adjacent room ids**, not arbitrary destination rooms elsewhere in the level.

### 6. Exit direction data is populated by flood fill from exit waypoints

For each room, a flood fill / breadth-first traversal from each inset exit waypoint is used to determine the preferred next step toward that exit for every reachable waypoint in the room.

### 7. Coincident waypoint positions should be reused rather than duplicated

If an inset exit waypoint lands on the same coordinates as an already generated room waypoint, the existing waypoint should be reused instead of creating a duplicate waypoint object at the same position.

## Rationale

This design keeps room-local navigation simple while avoiding premature complexity in cross-room graph semantics:

- wandering can choose adjacent waypoints directly
- occupancy is easier to reason about when characters rest only on waypoints
- exit routing can be precomputed locally within each room
- room transitions remain explicit and compatible with existing room-entry behavior

Restricting `exitDirections` to adjacent room ids keeps the initial model focused and avoids mixing local room routing with full multi-room pathfinding concerns.

## Consequences

### Positive

- Simpler room-local wandering logic
- Stronger basis for one-character-per-waypoint occupancy rules
- Clearer movement invariants than arbitrary point-in-room targets
- Precomputed local routing toward exits

### Negative

- Cross-room movement still requires explicit transition logic
- Some geometrically possible paths may still be unavailable in complex obstruction layouts
- More work remains to migrate all movement producers onto waypoint semantics

## Implementation Notes

Implementation should proceed roughly as follows:

1. Generate grid waypoints for each room.
2. Add or reuse inset exit waypoints for each connected exit on each room side.
3. Build room-local waypoint adjacency.
4. Remove `adjacentExits` from waypoint data.
5. Compute `exitDirections` by flood fill from inset exit waypoints.
6. Update movement-producing code such as `wanders` and `at` to operate on waypoints.

## Not Chosen

### Cross-room waypoint adjacency

Not chosen initially.

Reason:

- it blurs room-transition semantics
- it makes `RoomEntryEvent` handling less explicit
- explicit exit traversal is easier to reason about during migration

### `RoomExit.waypoint`

Not chosen.

Reason:

- each shared exit needs a distinct inset waypoint per room side
- a single waypoint on `RoomExit` would be ambiguous
- side-specific waypoint generation belongs to room navigation, not the exit record itself
