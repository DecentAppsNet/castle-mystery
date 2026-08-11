# ADR 004: File-Order Relative Itinerary Timestamps

## Status

Accepted

> **ADR 011 clarification:** [ADR 011](adr-011-itinerary-derived-timeline-bounds.md) preserves the absolute and relative `@` scheduling semantics in this ADR, but overrules any implication that back-planned movement determines the level start. The level start uses the earliest authored absolute timestamp directly, including when that timestamp belongs to an `@` activity. ADR 011 also requires the first itinerary activity to be absolute, so a relative `:` activity cannot be first.

## Context

The itinerary format supports a leading `:` timestamp form, for example:

- `: Jester says "Surely it must be a hardship, sire."`
- `: King says "Where did I put that book?"`
- `: King @ Library`

This syntax is useful for authored sequences where the next activity should follow naturally from the one written immediately before it in the level file.

A key use case is interleaved dialogue between multiple characters:

- `King says ...`
- `: Jester says ...`
- `: King says ...`

In this style, each line should begin only after the previously authored activity has completed, even when the speaker changes.

At the same time, `@` activities have special movement semantics. Absolute authored timestamps such as:

- `0:00:34 King @ Library`

mean the character must already have arrived by that timestamp, so generated movement is back-planned before the authored time.

For `:` timestamps, that back-planned meaning does not fit the author intent. In:

- `: King @ Library`

what matters is that the generated movement should begin only after the previously authored activity has completed.

## Decision

We define `:` timestamps as file-order relative lower bounds.

### 1. `:` refers to the single previous authored activity in file order

The previous activity is the one immediately above the current activity in the level file after itinerary parsing.

It is **not**:

- the previous activity for the same character
- the previous chronological activity after sorting by time
- the previous activity that happens to complete latest

This allows level authors to alternate between characters naturally in authored dialogue and action sequences.

### 2. The completion of the previous authored activity defines the relative lower bound

For an activity with a leading `:`, the completion time of the immediately previous authored activity becomes the lower-bound timestamp for the current activity.

The intended meaning is:

- the first generated event for the current activity must not begin before all events from the previous authored activity have completed

This applies regardless of which character the previous activity specified.

### 3. The acting character's own availability is still enforced

A `:` activity may not begin before the acting character is available to perform it.

Therefore, the effective start time is constrained by both:

- the completion time of the previous authored activity in file order
- the acting character's own current availability

If the actor is still busy, the activity begins later rather than failing solely because the actor is not yet free.

### 4. For most activities, `:` means "start after"

For activities whose first event naturally occurs at the authored timestamp position, the relative lower bound acts as the earliest allowed start time.

Examples:

- `: Character says ...`
- `: Character faces ...`
- `: Character wanders`
- `: Character takes Item`

In each case, the first event of that activity begins at or after the previous authored activity's completion, subject to actor availability.

### 5. `: Character @ Room` also uses a lower-bound start model

`@` is the only activity whose absolute timestamp form plans movement in advance of the authored time.

For absolute timestamps:

- `0:00:34 King @ Library`

means King must arrive by `0:00:34`, so movement is back-planned to end at that timestamp.

For relative timestamps:

- `: King @ Library`

we do **not** back-plan from the lower-bound timestamp.

Instead:

- the generated movement events have a lower bound immediately after the previous authored activity completes
- those movement events begin at or after that lower bound, subject to actor availability

So the relative `@` form behaves like a "begin traveling after" activity, not an "arrive by this exact time" activity.

## Rationale

This design preserves the most useful authored meaning of `:`:

- level authors can write interleaved conversational turns naturally
- file order remains the source of truth for relative chaining
- the engine does not reinterpret `:` per character, which would make authored dialogue more awkward
- `@` retains its intuitive arrival-by semantics for absolute timestamps while gaining a more useful start-after meaning for relative timestamps

This also reduces surprising failures where a valid interleaved dialogue sequence would otherwise be rejected because the previous activity belonged to a different character.

## Consequences

### Positive

- Interleaved multi-character dialogue is easy to author
- File order remains the authoritative meaning of `:`
- Relative `@` activities become useful in authored step-by-step action sequences
- Actor availability is still respected without changing the author's intended chain structure

### Negative

- `:` no longer implies anything specifically about the same character's previous activity
- The meaning of `@` differs between absolute and relative timestamp forms
- Good error messages remain important when an activity still cannot be scheduled for other reasons

## Implementation Notes

Implementation should follow these principles:

1. Parse itinerary activities in file order.
2. For each `:` activity, resolve its lower-bound timestamp from the completion time of the immediately previous authored activity.
3. Respect the acting character's own availability when deciding the actual start.
4. For absolute `@`, continue back-planning arrival to the authored timestamp.
5. For relative `@`, schedule generated movement to begin no earlier than the resolved lower bound.
6. Throw descriptive errors only when the activity still cannot be scheduled under those rules.

## Not Chosen

### Same-character chaining for `:`

Not chosen.

Reason:

- it breaks natural interleaved dialogue authoring
- it makes authored file order less meaningful
- it forces authors to use explicit timestamps more often in conversational scenes

### Chronological chaining after global sort

Not chosen.

Reason:

- it makes `:` depend on derived timing rather than authored structure
- it is harder for authors to reason about
- it undermines the usefulness of file order as narrative sequencing
