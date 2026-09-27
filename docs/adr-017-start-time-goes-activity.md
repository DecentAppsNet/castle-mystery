# ADR 017: Start-Time `goes` Activity

## Status

Accepted

## Context

The `@` itinerary activity currently combines room positioning with two timestamp meanings. An absolute timestamp is an arrival deadline, so movement is back-planned. A relative `:` timestamp instead starts movement after the preceding authored activity completes.

That distinction is useful for existing authored levels but makes start-time movement awkward to express and complicates chronological timeline behavior. We need an explicit movement activity whose timestamps consistently refer to its start.

## Decision

Add `goes` as the movement-producing itinerary activity.

- Its accepted form is `Timestamp [CharacterId] goes [to] [RoomId] [(HorizontalTarget%)]`.
- `to` is optional syntax only; it does not affect scheduling or destination selection.
- Both absolute and relative timestamps identify movement start time. A relative timestamp resolves to the completion of the immediately preceding authored activity in file order.
- Room-only, room-plus-percentage, and percentage-only destinations reuse the existing room waypoint selection and routing behavior.
- A `goes` activity occupies the acting character from its start time through walking completion. Its end time is the movement completion time.

`@` remains unchanged for now:

- an absolute `@` timestamp remains an arrival deadline and back-plans movement;
- a relative `@` timestamp remains a start-after movement activity;
- existing level files are not migrated in this decision.

A separate reviewed plan will convert `@` into deferred room-placement validation and migrate existing authored movement to `goes`.

## Rationale

A verb dedicated to movement gives authors one timestamp rule for both absolute and relative syntax. Keeping `@` unchanged avoids silently changing the timing of existing levels while the authoring language transitions.

## Consequences

- New authored start-time movement should use `goes`.
- `goes` and `@` temporarily coexist with intentionally different absolute-timestamp meanings.
- Movement destination behavior remains consistent during migration because both relative `@` and `goes` use shared start-time room-movement scheduling.
- The future `@` conversion must supersede this temporary coexistence documentation and migrate current `@` room-movement uses.
