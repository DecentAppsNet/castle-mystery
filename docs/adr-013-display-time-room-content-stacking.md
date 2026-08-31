# ADR 013: Display-Time Room Content Stacking

## Status

Accepted

## Context

Several items may occupy one room floor square. They must render as a vertical stack, and characters at that square must stand on top of the complete item stack. Authored item offsets can also move later stack members in all three dimensions.

The position used to answer world and navigation questions is not necessarily the position used to draw a stack member. In particular:

- level loading needs stable floor positions when placing items, resolving drops, and determining whether a navigation location is claimed
- character movement uses actual, potentially interpolated positions
- item stack height and authored drawing offsets affect presentation without changing which floor square contains the item or character
- item visibility can change over time, causing the visible stack to collapse or grow

A previous implementation applied structural Y offsets while loading or scheduling the level. This encoded a presentation decision in world state and made an item's underlying floor position harder to use.

## Decision

Room-content stacking is calculated ephemerally at display time. Stored item and character positions remain world positions and are never rewritten to represent stack layers.

### 1. Stored positions retain world meaning

Every room item stores its floor-square position regardless of its layer in a visible stack. Items sharing a floor square therefore have equal stored positions unless their world locations genuinely differ.

A character stores its actual world position. While moving, this may be an interpolated position between floor-square centers.

Loading, timeline scheduling, and room state do not assign structural stack heights. They may parse and preserve authored `drawOffset` and `stackOffset` values, but those values do not alter stored positions.

### 2. One pure layout derives display positions

`createRoomContentDisplayLayout()` is the authority for deriving display-time item and character positions for one room snapshot. It receives the room and the characters currently in it and returns local maps keyed by stable IDs.

The layout is pure:

- it does not mutate the room, items, characters, timeline, or game state
- it does not cache results on persistent objects
- it has no canvas or level-loading dependency
- callers explicitly create and retain a layout when several lookups must share one calculation

Separate draw, hover, or popover passes may each create a local layout from the current snapshot.

### 3. Items stack in room-array order

Visible items at each floor square are processed in `room.items` order. The first visible item is the bottom member.

Each square has a cumulative support transform initially equal to zero. For each visible item:

1. Its display position is its stored position plus the cumulative support transform plus its own `drawOffset`.
2. Its display position is recorded without changing the item.
3. The support transform for later members advances by:
   - the item's `drawOffset`
   - the item's `stackOffset`
   - one implicit item cuboid height in the negative Y direction

An item's own `stackOffset` therefore affects only later content. Its `drawOffset` affects itself and propagates once to every later member.

Invisible items are neither drawn nor supports. Removing or hiding an item collapses the visible stack during the next layout calculation without rewriting any positions.

### 4. Characters use the nearest square's support transform

A character's position is snapped to the nearest floor-square center only to select a support stack. The resulting drawable metadata calls this the `snappedPosition`.

The character's display position is its actual position plus that square's final cumulative item support transform. Its actual movement path is not replaced by the snapped position. Consequently, a moving character switches stack transforms around the midpoint between squares while retaining its interpolated base position.

Characters do not support one another. Every character at a square receives the same item-derived transform, and adding another character does not raise either character or any item.

### 5. Drawable entries carry ephemeral layout metadata

Static room drawable entries carry the calculated `displayPosition`. Character entries additionally expose `snappedPosition` so ordering can identify the selected support square without suggesting that the character itself was moved there.

Stacked entries also carry:

- a shared `painterOrderAnchor` for the stack group
- a `stackMemberI` assigned by the layout

Drawing and interaction geometry consume the drawable entry's exact display position. This includes item and character images, character body and held-item layouts, highlights, canvas bounds, hover bounds, speech and undiscovered markers, and selection-effect origins.

Top-level popover passes calculate a fresh local layout because drawable metadata is intentionally not persisted in game state.

### 6. Painter ordering treats a stack as one group

All members associated with one floor square are ordered as a group. Different groups are compared using their shared painter-order anchors and the existing depth, Y, and X conventions.

Within one group:

- items follow `room.items` order
- every item draws before every character
- characters retain deterministic position/ID ordering and do not vertically stack

Using a shared primary sort key makes the comparator transitive. Individual offsets on an upper item cannot move it before a lower member or interleave another stack between members of one stack.

Stair merging retains its existing behavior. Character-to-stair comparisons continue to use the character's stored world position rather than stack height.

### 7. Item-transfer animation queries remain ephemeral

An item-transfer effect may ask an already-created room-content layout where an item would display at a floor square. With no insertion index, this pure prospective query predicts appending the item after all current visible supports. This is the destination contract used by drop effects.

With a zero-based room insertion index, the query instead reconstructs where the candidate would display if inserted at that point in `room.items`. Only visible, same-square room items before the index contribute support. This allows a take effect to remove an item from the room while reconstructing its pre-removal source position from its original array index.

Both forms apply each preceding support's `drawOffset`, `stackOffset`, and implicit cuboid height exactly once. They apply the candidate's own `drawOffset`, but not its own `stackOffset`, to its display position.

The query does not add the candidate to the room, layout maps, or support data. Transfer effects therefore do not make transient item clones participate in static room drawing, and no prospective display position enters persistent state. Concurrent edits to the same source stack can make a previously captured insertion index less exact, but reconstruction remains deterministic; a general square reservation mechanism may be introduced later if authored timelines require stronger guarantees.

## Rationale

Stack height is presentation derived from the current visible contents of a room. Calculating it at display time keeps level loading focused on authored world structure and leaves stored positions useful for navigation and placement operations such as determining whether a floor waypoint is claimed.

The design also avoids synchronizing redundant state. Visibility changes, item removal, drops, and movement automatically produce a new layout from the current snapshot. There is no stored display position that can become stale or disagree with the room's item order.

Explicit layout creation makes the calculation cost visible to callers and allows one calculation to serve drawing, ordering, and bounds within a pass. Passing final display positions into geometry helpers prevents those helpers from independently calculating a different layout or applying offsets twice.

## Consequences

### Positive

- Level loading and timeline state retain simple floor/world positions.
- Navigation and placement logic can use unoffset positions directly.
- Hiding, taking, dropping, or reordering items updates stacks without state migration.
- Character interpolation remains world-based and is not snapped to floor centers.
- Drawing, bounds, hover selection, markers, and popovers share one position contract.
- Same-square ordering is deterministic and remains valid when offsets alter X, Y, or Z.
- Display metadata cannot become stale in persistent state because it is never stored there.
- Item transfers can predict append destinations or reconstruct removed source positions without persisting presentation coordinates.

### Negative

- A room layout must be recalculated in each independent draw, pointer, or popover pass that needs it.
- Display geometry APIs must accept explicit positions, increasing call-site verbosity.
- The nearest-square support transform changes discretely near a square midpoint.
- Static stacking and take/drop animation anchors can differ until animation stacking is designed separately.
- An insertion index captured before a transfer may become less exact if the same stack is concurrently edited.

## Implementation Notes

1. Shared floor-square geometry lives in game runtime code so both loading and display layout can use it without game code importing level-loading modules.
2. `createRoomContentDisplayLayout()` scans visible room items in array order and records item and character entries in ID-keyed maps.
3. Item support transforms include implicit cuboid height plus authored `drawOffset` and `stackOffset` propagation.
4. `displayPosition`, `snappedPosition`, painter anchors, and member indices remain local layout/drawable values, not fields on `Room`, `Item`, `Character`, timeline snapshots, or `GameState`.
5. Effect-specific base-position helpers are named separately from static display-position APIs.
6. Canvas-heavy behavior is validated with manual smoke tests in addition to pure layout tests and existing drawing tests.

## Not Chosen

### Apply structural Y offsets during level loading

Not chosen because stacking is a presentation concern. Encoding stack layers while loading makes level loading aware of item rendering height and visibility behavior, and obscures the underlying floor position needed for operations such as checking whether a waypoint is claimed.

It would also require later loading or scheduling operations to preserve or reconstruct the unoffset position when items are moved, dropped, hidden, or removed.

### Store both floor and display positions on `Room` and `Item`

Not chosen because no level-loading operation needs the display position. Adding both representations to persistent/runtime model types would move presentation state across the separation boundary, require synchronization whenever room contents or visibility change, and permit stale display positions.

Alternative model representations that distinguish the two positions more strongly have the same drawback: they make display layout part of room/item state despite it only being consumed by presentation and interaction geometry.

### Derive positions independently inside each drawing helper

Not chosen because hidden layout creation duplicates work and risks disagreement between rendering, bounds, hover testing, and ordering. The layout is created explicitly at the pass boundary, and final positions are threaded through geometry helpers.

### Order all drawable content by individual display coordinates

Not chosen because an upper item's propagated offsets could reorder members of one logical stack or interleave another stack. Shared painter-order anchors and explicit within-stack rules preserve both transitivity and authored item order.
