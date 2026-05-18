# ADR 009: General Time Fields Reinterpretation

## Status

Proposed

## Supersedes

- [ADR 007](adr-007-timeline-start-end-config.md)

## Context

The current implementation and ADR 007 treat `time` and `startTime` as aliases and give `endTime` cross-midnight-driven semantics.

That no longer matches the intended author-facing meaning documented in [LEVEL_FORMAT.md](../LEVEL_FORMAT.md):

- `startTime` is the earliest time that the level uses when describing when events occur
- `time` is the time shown on the slider when the player first begins the level
- `endTime` is the latest time that the level uses when describing when events occur

Under this meaning:

- `startTime` and `time` are distinct fields
- `startTime` and `endTime` describe the authored time span of the level
- `time` selects the initial playhead position within that span
- omitted values are derived from itinerary content where possible

## Decision

We will reinterpret `startTime`, `time`, and `endTime` as separate author-facing concepts.

### 1. `startTime` and `endTime` define authored time bounds

`startTime` is the earliest time the level uses when describing events.

`endTime` is the latest time the level uses when describing events.

When both are present, they define the authored wall-clock span directly.

If `endTime` is numerically less than or equal to `startTime`, the level is interpreted as crossing midnight and the resolved internal `endTime` is moved to the next day by adding 24 hours. Under that rule:

- `startTime=10:00`, `endTime=18:00` means a same-day span
- `startTime=19:30`, `endTime=07:00` means a cross-midnight span
- `startTime=00:00`, `endTime=00:00` means a 24-hour span

For a resolved cross-midnight span, absolute itinerary timestamps are interpreted using the same wall-clock rule as ADR 007: any absolute timestamp whose parsed time-of-day is less than `startTime` is treated as next-day and has 24 hours added before validation. This keeps authored itinerary timestamps in normal `HH:MM:SS` form.

When omitted:

- `startTime` defaults to the earliest itinerary timestamp
- `endTime` defaults to the latest itinerary event end time
- if there are no character itineraries, `startTime` defaults to midnight and `endTime` defaults to `startTime`
- if the level contains relative `:` activities that would define earliest or latest times, the loader derives the resulting absolute times and durations using the existing itinerary-resolution logic, then uses those resolved times when defaulting `startTime` and `endTime`

### 2. `time` defines the initial playhead position

`time` means the initial slider position when play begins.

If omitted, it defaults to the resolved `startTime`.

It is not an alias for `startTime`.

Whether authored explicitly or supplied by default, resolved `time` must lie within the resolved authored span from `startTime` to `endTime`.

### 3. All three fields may appear together

It is valid for a level to specify all of:

- `startTime`
- `time`
- `endTime`

Example:

- `startTime=08:00`
- `time=08:30`
- `endTime=12:00`

This means the authored level spans 08:00–12:00 and the player begins with the slider at 08:30. In fact, any combination of specifying or omitting these three values is valid.

### 4. Itinerary times must fit the resolved authored span

After default resolution and any cross-midnight normalization:

- resolved `time` must satisfy `startTime <= time <= endTime`
- every absolute itinerary timestamp must satisfy `startTime <= resolvedTimestamp <= endTime`
- every itinerary event end time must satisfy `resolvedEndTime <= endTime`

If an explicit `startTime` or `endTime` causes an itinerary event to fall outside the resolved authored span, level loading fails with a helpful error.

That error should identify the offending itinerary event and suggest a `startTime` or `endTime` value that would include it.

In the normal inferred case, out-of-bounds itinerary events should not occur, because omitted bounds are derived from the resolved itinerary itself.

## Remaining Open Questions

- None at the ADR level. Any remaining edge cases should be settled during implementation, as long as they preserve the author-facing rules above.

## Implementation Plan

### Phase 1. Parsing and data model

1. Update `_parseGeneralSection()` in [src/levelLoading/levelUtil.ts](../src/levelLoading/levelUtil.ts) so it parses `startTime`, `time`, and `endTime` as three distinct fields.
2. Remove the alias relationship between `time` and `startTime`.
3. Extend the parsed general-section type so it carries all three values separately.
4. Update `Level` and any derived state needed to represent authored bounds separately from the initial playhead time.

### Phase 2. Timeline derivation

1. Add a derivation pass that computes earliest absolute itinerary time and latest itinerary event end time.
2. Preserve the existing itinerary-resolution logic for relative `:` activities and use its resolved timestamps/end times when supplying omitted `startTime` and `endTime` defaults.
3. Use the derivation pass to supply omitted `startTime` and `endTime` defaults.
4. Interpret explicit `endTime <= startTime` as a cross-midnight authored span by adding 24 hours to internal `endTime`.
5. In cross-midnight spans, map absolute itinerary timestamps whose time-of-day is less than `startTime` onto the next day before validation.
6. Default `time` to the resolved `startTime`.

### Phase 3. Validation

1. Validate that resolved `time` falls within the resolved authored span.
2. Validate that authored itinerary timestamps and event end times fit the resolved authored span.
3. When validation fails because of explicit `startTime` or `endTime`, produce an error that points to the offending event and suggests a bound that would include it.
4. Keep `activeCharacter` validation unchanged.

### Phase 4. Runtime wiring

1. Update level loading so authored timeline bounds and initial current time are derived separately.
2. Update game-state initialization so the initial current time comes from `general.time`, not from authored lower bound semantics.
3. Update slider initialization and labels to reflect authored bounds separately from the initial playhead.

### Phase 5. Tests and migration

1. Replace tests that assume `time` aliases `startTime`.
2. Add tests for:
   - distinct `startTime` and `time`
   - omitted `startTime` derivation
   - omitted `endTime` derivation
   - derivation from relative-only `:` itineraries using existing itinerary-resolution behavior
   - default `time = startTime`
   - cross-midnight authored spans under the new model
   - helpful out-of-bounds validation errors for explicit `startTime` / `endTime`
3. Update fixtures and authored docs accordingly.

## Rationale

This model is simpler for an author to understand.

An author can think in three questions:

1. What is the earliest time my level uses?
2. Where should the player begin on the slider?
3. What is the latest time my level uses?

That is easier to explain than the current alias-based behavior.

## Consequences

### Positive

- The documentation becomes more author-oriented.
- `time` becomes useful as a true initial-slider field.
- `startTime` and `endTime` become authored bounds instead of implementation-flavored controls.
- Cross-midnight levels can still use conventional wall-clock itinerary timestamps instead of 24+ hour notation.

### Negative

- Existing implementation assumptions around aliasing and cross-midnight behavior will need to change.
- Existing tests and fixtures will need migration.
- Helpful validation errors will require more loader logic than the current implicit-bound behavior.
