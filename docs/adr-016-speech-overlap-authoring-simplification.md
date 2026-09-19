# ADR 016: Speech Overlap Authoring Simplification

## Status

Accepted

Supersedes ADR 008.

## Context

ADR 008 introduced two dialogue verbs: ordinary `says`, which rejected overlapping speech from another audible character, and `interrupts`, which explicitly permitted that overlap. The intent was to identify likely authoring mistakes while allowing deliberate interruptions.

Loading-time audible-overlap validation depends on more than speech timestamps. It also depends on each character's position, movement along a route, room connections, and exit state at the relevant time. Those values belong to the resolved timeline.

The level loader builds that timeline incrementally. Activities are scheduled in chronological order where possible, but relative activity chains and activities whose authored timestamp represents an end time can leave relevant movement unscheduled when another speech activity is validated. Consequently, the editable timeline may still contain an earlier character position.

For example, a character can have an authored movement to a distant room before a later speech, while an absolute timestamp inside that activity chain makes the speech schedulable before the movement. Audible-overlap validation then sees the character in the old room and reports a conflict that does not exist in the completed timeline. Sorting by the movement's arrival time would address some cases but not movement whose intermediate route position determines audibility.

Eliminating these false positives while retaining the rule would require validating against a fully resolved timeline, adding a separate validation pass, or treating activity scheduling as a more global constraint problem. That complexity is disproportionate to the rule's value. Cross-character overlap is a presentation-quality concern rather than an invalid world-state invariant, and authors already playtest dialogue timing.

The `interrupts` verb exists only as an escape hatch from this validation. Without the validation, it has no distinct runtime meaning and unnecessarily expands the authoring language, parser, scheduler dispatch, tests, and documentation.

Same-character overlap is different. One character participating in two nonzero-duration activities at once is an invalid scheduling state. ADR 014 already handles that invariant centrally through `Activity.busyCharacterIds`, independently of speech-effect inspection or room audibility.

## Decision

### 1. Do not validate cross-character speech overlap during level loading

Different characters may have overlapping `says` activities regardless of whether they are within earshot. Level loading does not scan other characters' speech effects or room audibility to accept or reject a speaking activity.

Authors evaluate whether simultaneous dialogue is understandable and intentional through playtesting. The loader does not emit an error or warning for this presentation concern.

### 2. Remove the `interrupts` activity

`interrupts` is removed from the authored level language, parsing rules, scheduler dispatch, tests, levels, and current authoring documentation.

Intentional overlapping dialogue uses ordinary `says`. No separate runtime effect or persisted interruption designation is introduced.

### 3. Retain same-character activity conflict validation

Speech schedulers continue to declare the speaking character in `Activity.busyCharacterIds`. The central activity-conflict check continues to reject overlapping nonzero-duration activities that share that character, including two overlapping speech activities.

This is the same generic availability rule used by other character activities. It does not depend on earshot, effects, or the removed `interrupts` verb.

### 4. Retain runtime earshot behavior

Earshot remains a useful runtime concept. Player-facing features may continue to determine whether a character can hear speech from their room or an adjacent room through an open exit. In particular, time-slider speech markers continue to use resolved timeline state and earshot rules.

Only loading-time cross-character speech-conflict validation is removed.

## Rationale

The loader should enforce deterministic world and scheduling invariants. It should not reject a level based on presentation analysis performed against a timeline that may not yet contain all relevant movement.

Removing this validation eliminates an entire class of scheduling-order-dependent false errors. It also makes the authoring language smaller: authors use `says` for speech whether or not another character is speaking.

Generic busy-character validation remains appropriate because it operates on resolved activity intervals and explicit participants. It expresses a local invariant that does not require reconstructing audibility or predicting the final timeline.

Runtime earshot evaluation does not have the same problem. It reads the completed timeline for player-facing presentation and therefore remains both useful and correctly situated.

## Consequences

### Positive

- Valid levels are no longer rejected because movement relevant to audibility has not yet been scheduled.
- Dialogue authoring uses one spoken activity instead of separate `says` and `interrupts` forms.
- Speech scheduling no longer depends on other characters' effects, positions, room connections, or scheduling order.
- Cross-character speech-validation code, parser surface, tests, and diagnostics can be removed.
- Same-character conflicts continue to fail through the general activity-availability invariant.
- Runtime earshot behavior remains available for player-facing features.

### Negative

- The loader no longer points out potentially unintended overlapping dialogue between different characters.
- Authors must identify distracting or unintelligible overlap through playtesting.
- Existing authored `interrupts` activities must be migrated to `says`.

## Implementation Notes

1. Remove loading-time calls that validate speech against other characters' audible speech effects.
2. Retain speech duration calculation and `busyCharacterIds` declaration.
3. Delete `interrupts` parsing, scheduling, dispatch, tests, and current authoring documentation.
4. Convert existing authored `interrupts` activities to `says`.
5. Preserve runtime earshot helpers required by time-slider speech markers or other player-facing consumers.
6. Update ADR 014 so speech no longer has a specialized cross-character validation exception.

## Not Chosen

### Validate after the complete timeline is built

Not chosen because the rule detects a presentation concern rather than an invalid model state. A second validation pass and its diagnostics would add complexity without eliminating the need for playtesting.

### Improve activity ordering until incremental validation is reliable

Not chosen because ordering by authored arrival timestamps fixes only some cases. Audibility may depend on an intermediate position along a movement route, so reliable validation still requires the relevant movement to be fully scheduled.

### Keep `interrupts` as a synonym for `says`

Not chosen because the verb would communicate a distinction the runtime and loader no longer enforce. Removing it keeps the authoring language and implementation honest.

### Replace errors with warnings

Not chosen because warnings would retain the same scheduling-order-dependent false positives and diagnostic complexity while providing weaker value.