# ADR 011: Itinerary-Derived Timeline Bounds

## Status

Accepted

## Supersedes

- [ADR 007](adr-007-timeline-start-end-config.md), for general-section timeline bounds and cross-midnight interpretation
- [ADR 009](adr-009-general-time-fields-reinterpretation.md), for authored `startTime` and `endTime` fields and cross-midnight interpretation

## Context

The level format has allowed authors to specify `startTime` and `endTime` in the `# general` section while also expressing times in the itinerary. This creates two sources of truth for the timeline bounds. The declared bounds can contradict the itinerary, requiring extra parsing, normalization, and validation to infer or reject the author's intent.

Cross-midnight levels have also depended on the declared start time. Absolute itinerary timestamps earlier on a 24-hour clock than the declared start were treated as occurring on the following day. This makes timestamp meaning depend on separate metadata and can make both authored order and error messages harder to understand.

An absolute `@` activity has a separate complication: its timestamp means that the character arrives at the destination at that time, so scheduling normally back-plans movement. Calculating that movement before creating the timeline would introduce a dependency cycle between finding the timeline start and scheduling activities.

## Decision

Timeline bounds are derived exclusively from the itinerary.

### 1. General-section bounds are removed

`startTime` and `endTime` are no longer valid fields in the `# general` section. There is one source of truth for the timeline's temporal extent: the itinerary.

The `time` field remains the initial playhead position. It does not define either timeline bound. When omitted, it defaults to the derived level start time.

### 2. The level start is the earliest absolute itinerary timestamp

The loader parses the absolute timestamps on itinerary activities and uses the earliest authored absolute timestamp as the level start time.

This is timestamp inspection, not activity scheduling. Relative `:` activities do not directly provide a candidate level start timestamp.

### 3. An absolute `@` timestamp is used directly when deriving the level start

For normal scheduling, an absolute `Character @ Room` timestamp is an arrival time and generated movement is back-planned from it, as established by ADRs 001 and 004.

For the narrower purpose of deriving the level start, the loader does not calculate the implied movement start. If an absolute `@` activity has the earliest absolute timestamp, that authored timestamp itself becomes the level start.

This deliberate distinction avoids requiring activity scheduling before the timeline has been initialized. It does not relax the normal scheduling constraints for `@`. If an arrival cannot be scheduled using the initialized timeline, normal activity-scheduling validation determines whether the level is invalid; the loader does not revise the derived level start by pre-scheduling the movement.

### 4. The level end is determined after scheduling

After all activities have been scheduled, the level end time is the latest end time among the scheduled activities.

Unlike the level start, the level end therefore reflects generated event durations and relative activity scheduling.

### 5. The first itinerary activity must have an absolute timestamp

The first activity in file order must use an absolute timestamp. A relative `:` activity cannot be first because it has no preceding authored activity from which to derive its lower bound.

The loader still examines all absolute itinerary timestamps to find the earliest one; file order alone does not determine which absolute timestamp is earliest.

### 6. Cross-midnight and multi-day timestamps use increasing hour values

The loader does not infer a day rollover from a declared level start. Authors express chronological order directly by allowing the hour component to reach or exceed 24.

For example, an activity one second after midnight on the second day is authored as:

- `24:00:01 Character says "After midnight."`

A later day may continue with still larger hour values. This representation supports timelines longer than 24 hours and makes ordering unambiguous in the level file.

Presentation code may normalize such values to a conventional 24-hour clock for display, but parsing, scheduling, validation, and author-facing loading errors retain the authored extended-hour meaning.

## Rationale

A single source of truth for timeline bounds simplifies both the format and loader:

- authored bounds cannot contradict itinerary activities
- start-time discovery only requires timestamp parsing, not preliminary scheduling
- `@` activities do not introduce a cycle between timeline initialization and movement planning
- cross-midnight order is explicit in each timestamp instead of depending on separate metadata
- loading errors can report timestamps that match those written by the author
- extended hours naturally support timelines spanning more than one day

The asymmetric derivation is intentional. The start is based on the earliest authored absolute timestamp so the timeline can be initialized without scheduling. The end is based on completed scheduling so generated durations are included.

## Consequences

### Positive

- `startTime` and `endTime` are removed from the authored level format.
- Timeline bounds cannot disagree with itinerary content.
- Cross-midnight parsing no longer needs a declared start time or automatic day offset.
- Absolute timestamps have a stable numeric ordering as authored.
- Timelines may span more than 24 hours.
- Timeline initialization does not depend on scheduling `@` movement.

### Negative

- Existing levels that declare `startTime` or `endTime` must remove those fields.
- Existing cross-midnight levels using next-day `00:MM:SS` timestamps must migrate to `24:MM:SS` or a larger appropriate hour.
- An earliest `@` timestamp does not reserve time before the derived level start for movement, so an arrival that requires such time may fail normal scheduling validation.
- Every itinerary must begin with an absolute timestamp.

## Implementation Notes

1. Reject `startTime` and `endTime` in the `# general` section as unsupported fields.
2. Require the first itinerary activity to have an absolute timestamp.
3. Parse all absolute itinerary timestamps and use their minimum as `Level.startTime` without scheduling activities.
4. Do not back-plan `@` movement while deriving `Level.startTime`.
5. Initialize timeline scheduling from the derived start.
6. Set `Level.endTime` to the latest scheduled activity end after scheduling completes.
7. Accept hour components of 24 or greater and do not apply automatic cross-midnight offsets.
8. Keep `general.time` as the optional initial playhead position, defaulting it to the derived start.

## Not Chosen

### Authored general-section bounds

Not chosen because they duplicate information in the itinerary and create contradictory-input validation cases.

### Automatic midnight rollover

Not chosen because timestamp interpretation would depend on separate bounds and could obscure authored chronological order.

### Deriving the start from fully scheduled activity spans

Not chosen because scheduling an absolute `@` activity requires a timeline initialized with a start time. A preliminary scheduling pass or alternate parser would add complexity to resolve that cycle.
