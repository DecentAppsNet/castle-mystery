# ADR 001: Itinerary Timestamp Resolution

## Status

Accepted

## Context

Level-authored itineraries contain activities that occur at authored timestamps, for example:

- `Queen @ Library`
- `King faces Queen`
- `Queen takes Book`
- `King gives Dagger to Queen`

Some activities depend on the positions or state of characters and items at a specific time. We need a deterministic way to resolve those dependencies, especially when multiple activities share the same timestamp.

A key semantic requirement is that some activities describe an outcome **at** the timestamp, not a start time for work that begins there. For example:

- `0:00:10 Queen @ Library`

means Queen must have arrived at the Library by `0:00:10`. Any generated walk events must be back-planned so her pose at that exact timestamp is already correct.

## Decision

We use a shared world-state simulation by timestamp.

### 1. Character pose at a timestamp is authoritative

Character position and facing at time $t$ are derived from planned movement so that authored arrival-style activities are already true at $t$.

Examples:

- If `Queen @ Library` is authored at `0:00:10`, Queen's pose at `0:00:10` is her Library arrival pose.
- A same-timestamp activity such as `King faces Queen` should resolve against that pose, independent of whether Queen's itinerary was procedurally "generated first".

### 2. Same-timestamp mutable state is resolved in a fixed deterministic order

For activities at the same timestamp that mutate world state, we do **not** search for a "correct" ordering.

Instead, we evaluate them in a fixed deterministic order. If an activity cannot be resolved under that order, level loading fails with an error.

This applies to state changes such as:

- taking or dropping items
- giving items
- future interaction activities that depend on inventory or room contents

### 3. We do not infer author intent from ambiguity

If two same-timestamp activities conflict under the fixed ordering, we treat that as invalid authored data.

Example:

- `0:00:10 Queen drops Dagger`
- `0:00:10 King gives Dagger to Queen`

If the fixed order resolves Queen first, then her drop activity fails because she does not yet hold the dagger. The level author must resolve the ambiguity by changing authored timing or structure.

### 4. Read position from pose, read ownership from current world state

At time $t$:

- character pose is read from the pose-at-time model
- item ownership / floor placement / room contents are read from the evolving world state at that timestamp

This separates spatial truth from same-timestamp mutation order.

## Rationale

This design keeps the system predictable and easier to reason about:

- arrival-style activities remain intuitive
- same-timestamp mutable state has deterministic handling
- the loader does not try to guess a better ordering
- invalid authored ambiguity fails fast instead of producing hidden surprises

It also scales better as more activities are added that depend on character or item locations.

## Consequences

### Positive

- Deterministic level loading
- Clear semantics for arrival-style activities like `@`
- Easier debugging than heuristic reordering
- Extensible to future activities that depend on shared world state

### Negative

- Some same-timestamp authored combinations will be rejected even if a human could imagine an intended order
- Good error messages become important for author usability

## Implementation Notes

The implementation should follow these principles:

1. Parse and sort activities by timestamp.
2. Build shared timestamp-based state across all characters.
3. Resolve pose-at-time independently of arbitrary same-timestamp ordering.
4. Apply same-timestamp mutable activities in a fixed deterministic order.
5. Throw descriptive errors when an activity cannot be satisfied under that order.

A practical deterministic order may use:

1. timestamp
2. character id
3. source line number

## Not Chosen

### Global multi-pass generation

A generic pass-1 / pass-2 / pass-3 compiler was not chosen as the primary model.

Reason:

- dependencies are not purely hierarchical
- future activity types are likely to mix pose reads and world-state mutations
- a shared timestamp-based world model is a better long-term fit

### Intent inference or heuristic repair

Not chosen for the base design.

Reason:

- it hides ambiguity
- it makes authored behavior harder to predict
- it can be added later as a refinement if desired
