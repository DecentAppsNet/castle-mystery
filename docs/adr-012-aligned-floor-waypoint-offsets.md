# ADR 012: Aligned Floor Waypoint Offsets

## Status

Accepted

## Context

Room rectangles use the usual half-open containment rule: their left and top edges are included, while `rect.x + rect.width` and `rect.y + rect.height` are excluded.

A waypoint placed exactly at `room.rect.y + room.rect.height` is therefore outside that room according to normal point-in-rectangle checks. It is also on the boundary of an adjacent room, making room ownership ambiguous for a character resting at that position.

Floor-grid waypoints already avoided this ambiguity by using:

- `room.rect.y + room.rect.height - FLOOR_WAYPOINT_Y_OFFSET`

The small inset keeps a character visibly on the floor while placing their navigation position unambiguously inside the room.

Exit waypoints and stair-landing waypoints historically used their unadjusted architectural Y coordinates. Consequently, waypoints representing the same floor could have two slightly different Y values:

- ordinary floor waypoints used the offset Y
- exit and landing waypoints used the raw floor-boundary Y

That inconsistency required tolerance checks and special cases in waypoint classification, path simplification, and room containment. It could also make geometrically straight movement appear to change direction because one waypoint differed from neighboring floor waypoints only by the small offset.

## Decision

All navigation waypoints aligned with a floor or landing use the same inward Y offset.

### 1. Floor waypoints use the offset coordinate

A room's floor waypoint Y remains:

- `room.rect.y + room.rect.height - FLOOR_WAYPOINT_Y_OFFSET`

This is the canonical navigation coordinate for that floor.

### 2. Exit waypoints use the offset coordinate

Every exit waypoint uses:

- `exit.y - FLOOR_WAYPOINT_Y_OFFSET`

The rule applies to every exit waypoint, not only exits classified as floor exits by one particular room.

A shared exit may be at floor level for one adjacent room and elevated for the other. Applying the same rule to every exit preserves exact cross-room coordinate matching regardless of how either room classifies it.

### 3. Stair-landing waypoints use the offset coordinate

Waypoints representing stair landings use:

- `landingY - FLOOR_WAYPOINT_Y_OFFSET`

All waypoints across the surface of one landing use the same adjusted Y. This includes landing connections to exit waypoints and shared landing points between consecutive winding-stair stories.

Individual stair geometry does not need this adjustment. `StairFlight` coordinates and calculations along a flight retain their architectural Y values. The offset is applied when creating navigation waypoints for landings.

### 4. Architectural coordinates remain unadjusted

`RoomExit.y`, room rectangle boundaries, and `StairFlight` geometry remain raw architectural coordinates.

Code that validates geometry compares values within that architectural coordinate space. For example, a floor exit is architecturally at:

- `exit.y === room.rect.y + room.rect.height`

The offset is applied only when converting an architectural floor, exit, or landing position into a navigation waypoint position.

### 5. Waypoint comparisons use canonical coordinates

Code operating on waypoints should compare their canonical positions directly rather than accepting both raw and offset floor coordinates through tolerances.

Shared conversion helpers should be used when comparing an architectural exit or landing coordinate to a waypoint coordinate.

## Rationale

The original offset solves a room-ownership problem. A character resting exactly at a room's excluded bottom boundary may fail an ordinary containment check or appear to belong to the room below. Moving the navigation position inward by a visually negligible amount makes the character unambiguously inside the intended room.

Applying that rule consistently to floor-grid, exit, and landing waypoints provides additional benefits:

- all waypoints on one floor share one exact Y coordinate
- floor detection can use direct equality instead of tolerance-based dual-coordinate checks
- exit waypoints can coincide with other floor waypoints and be reused normally
- straight floor paths remain geometrically straight during path simplification
- room containment works consistently while characters rest at exits or landings
- cross-room exit matching remains exact because both rooms derive the same adjusted position
- navigation code no longer needs to know whether a floor-aligned waypoint originated from the room grid, an exit, or a stair landing

This establishes a clear separation between architectural coordinates and navigation coordinates: architectural data describes exact room and stair geometry, while navigation waypoints are inset where necessary to preserve unambiguous room membership.

## Consequences

### Positive

- Floor-aligned waypoint Y values are consistent across waypoint types.
- Character room membership remains unambiguous at floor boundaries.
- Exact waypoint comparisons replace tolerance and special-case handling.
- Path simplification does not need to ignore artificial Y differences between floor and exit waypoints.
- Exit and landing waypoint generation follows one predictable invariant.

### Negative

- Waypoint coordinates at exits and landings no longer exactly equal their source architectural Y coordinates.
- Code crossing from architectural geometry to navigation waypoints must explicitly apply the offset conversion.
- Debugging output must distinguish raw exit or stair coordinates from adjusted waypoint coordinates.
- Stair segments connected to adjusted landing waypoints can differ from their visual geometry by `FLOOR_WAYPOINT_Y_OFFSET`, although the difference is intentionally too small to be visible.

## Not Chosen

### Offset only ordinary floor-grid waypoints

Not chosen because it leaves exits and landings on a different Y coordinate despite representing the same walkable surface. That requires tolerance checks and waypoint-type-specific behavior.

### Offset exits only when they are floor exits for the current room

Not chosen because a shared exit can be at floor level for one room and elevated for the adjacent room. Room-local decisions would then produce different waypoint positions for the same shared exit and break exact cross-room matching.

### Keep raw waypoint coordinates and make room containment boundary-inclusive

Not chosen because a shared boundary would remain ambiguous: the same resting character position could be considered inside two adjacent rooms. The small inward offset preserves conventional half-open rectangle containment and gives each resting navigation position one clear room owner.

### Apply the offset to all stair geometry

Not chosen because stair flights describe architectural geometry and interpolation along a slope. Only landing navigation waypoints require canonical floor alignment; changing every stair coordinate would add complexity without a visible or navigation benefit.
