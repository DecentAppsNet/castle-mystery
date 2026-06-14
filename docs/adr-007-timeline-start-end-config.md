# ADR 007: Timeline Start and End Configuration

## Status

Superseded by ADR 009

## Context

Levels currently only specify a `time=` field in the `# general` section, which sets the level's wall-clock start time (e.g. `time=0:00`). The level's duration is implicitly derived from the latest event emitted by the itinerary loader.

This works fine for same-day timelines but breaks down when the narrative crosses midnight. A cross-midnight murder-mystery, for example, might run from 19:30 (dinner) on day one to 07:00 (discovery) on day two. With only `time=19:30` set, the itinerary parser has no way to know whether an authored timestamp like `00:15:00` means:

- "00:15 today" — which is *before* the level even starts, or
- "00:15 tomorrow" — the next morning.

The only workaround available before this ADR was to use 24+ hour notation in itinerary lines (e.g. `24:15:00` for "next morning 00:15"). `parseTimestampToMsecs` allows arbitrary positive integers for the hour part, so this works mechanically, but it's ugly to author, ugly to read in a diff, and leaks an implementation detail into level prose.

A second, smaller problem: levels have no way to declare an explicit *end* of the timeline. Without one, the loader has no basis to reject itinerary events that fall outside the intended window, and the time slider just runs to whenever the latest event happens to finish.

## Decision

We extend the `# general` section with two new fields and adopt cross-midnight semantics that fall out of them naturally.

### 1. `startTime` is the preferred name; `time` remains a legacy alias

`startTime` and `time` mean the same thing. New levels should use `startTime`. The two fields cannot both be present — specifying both is a load error, not a silent preference. Existing levels using `time=` continue to load unchanged.

### 2. `endTime` is optional and may wrap around midnight

If `endTime` is specified and is numerically less than or equal to `startTime`, the loader interprets this as a cross-midnight level and adds 24 hours to the parsed end time. So:

- `startTime=10:00, endTime=18:00` → 8-hour same-day timeline.
- `startTime=19:30, endTime=07:00` → 11.5-hour cross-midnight timeline (end resolves to 31:00 internally).
- `startTime=00:00, endTime=00:00` → 24-hour cross-midnight timeline (end resolves to 24:00 internally).

The resolved `endTime` is exposed on the `Level` type alongside `duration`. They are kinematically redundant (`endTime = startTime + duration`) but both useful: `endTime` reads naturally to a human, `duration` is the dominant interface for the time slider and game state.

### 3. Itinerary timestamps less than `startTime` are next-day in cross-midnight levels

When the level crosses midnight (rule 2), any *absolute* itinerary timestamp whose parsed value is less than `startTime` is interpreted as the next day — i.e. the loader adds 24 hours during itinerary parsing. This means authors write:

```
19:30:00 Hero @ Dining Car
00:15:00 Hero says "I cannot sleep."
06:45:00 Hero says "Morning."
```

…and `00:15:00` resolves to `24:15:00`-equivalent internal milliseconds. The ugly 24+ hour notation is no longer required; authored timestamps stay in conventional `HH:MM:SS` form.

The wrap rule is keyed on the level being cross-midnight, not on every level. Without an `endTime`, no wrap is applied. Without cross-midnight semantics, an itinerary timestamp less than `startTime` stays less than `startTime` — and will fail the window-validation check (rule 4).

`:` (file-order relative) timestamps are unaffected: they continue to anchor to the previous activity's completion time, irrespective of wall clock.

### 4. Itinerary timestamps must fall within `[startTime, endTime]` when `endTime` is set

If `endTime` is explicitly specified, every absolute itinerary timestamp must satisfy `startTime <= resolvedTime <= endTime`. Events outside the window throw `LoadLevelException` with the offending line number. This catches typos and authoring mistakes at load time instead of producing weird playback.

When `endTime` is not specified, the loader continues the legacy behaviour: the level's duration comes from the latest itinerary event's end time and no window-validation runs.

## Rationale

Wall-clock authoring stays natural for cross-midnight scenarios. Validation catches mistakes at load time. The two-field model (`startTime` + `endTime`) cleanly separates "when does this level begin" from "when does it end", which removes a class of latent assumptions in the loader where `duration` was always trailing the itinerary's emergent shape.

Keeping `time` as a legacy alias preserves existing levels that use it (e.g. `public/levels/00_prologue.md`) unchanged.

## Consequences

### Positive

- Cross-midnight levels can use conventional `HH:MM:SS` notation throughout the itinerary.
- Explicit `endTime` enables window validation, surfacing authoring errors at load time.
- Overnight (dinner-to-morning) levels can shed the 24+ hour timestamp workaround.
- `Level.endTime` gives downstream consumers a wall-clock end that pairs naturally with `startTime`.

### Negative

- Two ways to specify start time (`time` and `startTime`) until `time` is deprecated. The error-on-both rule keeps the ambiguity from biting.
- `endTime <= startTime` is silently interpreted as cross-midnight rather than rejected as nonsense. Authors who *meant* "same day but smaller" will not be warned; the documented rule is the only safeguard.
- Window validation only runs when `endTime` is set. Levels using only `time=` retain the unbounded behaviour.

### Migration

- `public/levels/00_prologue.md` uses `time=11:00:00` and is unchanged.
- New levels should prefer `startTime=` (and add `endTime=` when the narrative has a clear end).
- A cross-midnight level can use `startTime=19:30` + `endTime=07:00` instead of `time=19:30` to host overnight itinerary entries.

## Implementation

- `_parseGeneralSection` in [src/game/levelLoading/levelUtil.ts](../src/game/levelLoading/levelUtil.ts) accepts both `time` and `startTime`, errors if both present, and parses `endTime` with the cross-midnight wrap.
- `Level` ([src/game/types/Level.ts](../src/game/types/Level.ts)) gains `endTime:number`.
- `loadItineraries` in [src/game/levelLoading/levelItineraryLoader.ts](../src/game/levelLoading/levelItineraryLoader.ts) takes a `LoadItinerariesOptions` parameter carrying `isCrossMidnight` and `explicitEndTime`. Absolute timestamps less than `level.startTime` are bumped by `MSECS_IN_DAY` when `isCrossMidnight` is true. Window validation runs when `explicitEndTime` is non-null.
- Tests in [src/game/__tests__/levelUtil.test.ts](../src/game/__tests__/levelUtil.test.ts) under the `timeline start/end configuration` describe block cover: `startTime` parsing, the both-fields error, same-day `endTime`, cross-midnight `endTime`, cross-midnight itinerary resolution, and window-violation rejection. Fixtures live in `src/game/__tests__/fixtures/timeline-*.md`.

## Related

- [ADR 001](adr-001-itinerary-timestamp-resolution.md) — back-planning semantics for `@` activities. Unaffected by this change; cross-midnight resolution happens before back-planning.
- [ADR 004](adr-004-file-order-relative-itinerary-timestamps.md) — `:` (file-order) timestamps. Unaffected; only absolute timestamps wrap.
