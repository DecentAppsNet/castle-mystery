# ADR 008: Dialogue Overlap Authoring

## Status

Accepted

## Context

Dialogue authoring currently uses `says` activities such as:

- `0:00:01 Bob says "Everyone! Quiet now, please. I have something to say."`

This is easy to author, but it creates an intent-versus-behavior problem when multiple characters are temporally able to speak at the same time.

Some overlap is clearly valid:

- two separate conversations in different parts of the level
- one character deliberately interrupting another

Some overlap is almost certainly invalid:

- a single character having two overlapping speech events

There is also an important middle case that is suspicious but may be intentional. Example:

- `0:00:00 Bob says "Why hello there, June! I have more than one second of things to say to you right now."`
- `0:00:01 June @ Living Room`
- `: June says "Hi, Bob."`

Here, the author may have intended June to wait until Bob finished, but absolute timestamps can legitimately make June begin speaking while Bob is still talking. That behavior is not inherently wrong, but plain `says` does not clearly express whether overlap is intended.

The loader already has a clear rule for file-relative `:` timestamps from [docs/adr-004-file-order-relative-itinerary-timestamps.md](docs/adr-004-file-order-relative-itinerary-timestamps.md): each `:` line waits only for the immediately previous authored activity in file order. That means cross-character overlap can still arise legitimately after level load.

We want a rule that:

- rejects clearly invalid same-character overlap
- rejects likely-mistaken audible cross-character overlap by default
- preserves a clear author escape hatch for intentional interruption
- avoids banning valid simultaneous speech in unrelated parts of the level

## Decision

We distinguish between `says` and `interrupts` as separate authoring verbs.

### 1. Same-character overlapping speech is always invalid

A character may never have two overlapping speech events.

This rule applies regardless of authored verb:

- `says`
- `interrupts`

If a newly generated speech event overlaps an existing speech event for the same character, level loading fails.

### 2. `says` is the non-overlapping audible default

A `says` activity means:

- begin this speech only if no other audible character is already speaking at the speech start time

If another character is already speaking in the speaker's active room or active-audible rooms at the new speech's start time, level loading fails.

### 3. `interrupts` explicitly permits talking over other characters

An `interrupts` activity behaves like `says` for speech generation and playback except for one difference:

- it does not fail when other characters are already speaking in the speaker's active room or active-audible rooms

It is the author's explicit statement that cross-character overlap is intended.

It does **not** waive the same-character overlap rule.

### 4. Audible overlap is evaluated from the speaker's room at speech start time

For a newly generated speech event, the loader determines the speaker's room at the speech start time.

That room is treated as the reference active room for this validation.

The overlap check includes:

- the speaker's own room
- any rooms that are active-audible from that room under the same room-audibility rules used by the game

This is intentionally local to the speaker's point of view rather than global across the whole level.

### 5. Overlap checks are start-time checks, not whole-duration room simulations

The cross-character authoring validation is evaluated at the new speech event's start time.

It does not attempt to predict later movement or changing audibility during the remainder of the speech.

This keeps the rule understandable for authors and tractable for the loader.

### 6. Simultaneous plain `says` in mutually audible rooms are invalid

If two characters both use plain `says` and one begins while the other is already speaking, the later processed `says` activity fails.

This includes same-timestamp starts when the deterministic loader ordering causes one to observe the other as already active.

Authors who want deliberate overlap in that situation must use `interrupts`.

### 7. Diagnostics should explain both the conflict and the likely fix

When level loading fails for dialogue overlap, the message should identify:

- the new speaking character
- the conflicting speaking character when applicable
- the room or audible context when available
- the new speech start time
- the earlier speech end time
- whether the author can fix the issue by moving the later speech or by using `interrupts`

The goal is not only to reject the level, but to show the author why the loader believes the plain `says` authoring does not match the resulting behavior.

## Rationale

This design makes the default authoring form safer without over-constraining valid scenes.

Plain `says` matches the common author expectation:

- normal conversation should not accidentally overlap in an audible shared scene

`interrupts` provides an explicit, local override when overlap is desired:

- argument
- interruption
- crowd noise
- someone talking over a speaker on purpose

Restricting the cross-character check to the speaker's room and audible neighbors avoids a global "only one person in the level can talk" rule, which would be too strict and would reject unrelated simultaneous scenes.

Keeping same-character overlap as an unconditional error preserves a strong invariant that is easy for authors and developers to understand.

## Consequences

### Positive

- Plain dialogue authoring becomes safer by default
- Intentional interruption is explicit in the level file
- Unrelated simultaneous speech remains allowed
- Same-character overlap continues to fail fast as clearly invalid authored data
- Error messages can point authors toward either retiming or verb choice

### Negative

- The itinerary loader must perform cross-character audible overlap checks during speech generation
- Same-timestamp plain `says` lines may fail depending on deterministic processing order
- Authors must learn one more verb
- Authoring semantics now depend on room audibility rules as well as timestamps

## Implementation Notes

Implementation should follow these principles:

1. Continue rejecting same-character overlapping speech for all dialogue verbs.
2. Extend itinerary parsing so `interrupts` is recognized as a dialogue activity.
3. For `says`, determine the speaker's room at the speech start time.
4. Compute the rooms that are audible from that room using the same audibility model used by gameplay.
5. Check whether any other character has an active speech at that same start time in those rooms.
6. If so, throw a descriptive load error.
7. For `interrupts`, skip only the cross-character audible overlap check.
8. Keep runtime playback behavior unchanged; this ADR is about authoring validation and explicit intent.

Since the `interrupts` keyword only affects validation of the level file during level loading, that designation doesn't need to persist beyond level loading in the itinerary of the loaded level. It's not necessary to create a new itinerary event for interrupting.

## Not Chosen

### Warning-only overlap detection for plain `says`

Not chosen as the base rule.

Reason:

- the common case is that audible overlap under plain `says` is an authoring mistake
- failing fast gives clearer feedback than a warning the author may miss
- `interrupts` provides a direct explicit override for intentional overlap

### Global single-speaker validation across the entire level

Not chosen.

Reason:

- different parts of a level may legitimately contain simultaneous dialogue
- author intent should be judged by local audibility, not global absolute time alone
- a global rule would reject valid unrelated scenes

### Treating all overlap as acceptable and relying on playback only

Not chosen.

Reason:

- it leaves likely authoring mistakes silent
- the resulting behavior can differ from what a plain reading of `says` suggests
- explicit author intent is preferable to inferred tolerance

### Allowing `interrupts` to overlap with the same speaker's own speech

Not chosen.

Reason:

- that case is still best treated as invalid authored data
- the purpose of `interrupts` is to permit cross-character interruption, not self-overlap
