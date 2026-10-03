# ADR 014: Character Activity Availability

## Status

Accepted

## Context

Level loading must reject timelines in which one character or item participates in incompatible activities at the same time. Previously, some availability rules were inferred from runtime effects. Item transfers, for example, searched for active transfer effects, and a give created a handler-less effect on the receiver solely to reserve that character.

That approach mixed authoring validation with presentation state. It also made availability operation-specific: each scheduler needed to know which effects represented a busy character. Effects can cover only part of an activity, while participation can cover more. A give receiver, for example, participates while the giver approaches as well as while the item is animated.

Activity syntax determines participation. The receiver of a give participates, but a character named as a drop location, facing target, or speech listener does not necessarily participate. This meaning belongs with the scheduler that interprets each activity.

## Decision

### Activities own loading-time availability

`Activity.busyCharacterIds` and `Activity.busyItemIds` are the sources of truth for participant availability while loading a level. They are loading-only state and are not copied into the runtime timeline, characters, items, keyframes, or effects.

Each activity scheduler explicitly derives its busy participants from normalized parsed parts. There is no generic default. Empty arrays are valid when an activity has no busy participant of that kind.

This keeps syntax-specific policy beside syntax-specific scheduling. For example, `gives` declares both giver and receiver busy, while `drops` declares only its subject busy.

### The scheduler enforces conflicts centrally

The central scheduler validates availability after an activity scheduler succeeds. At that point the activity scheduler has resolved the activity's actual start time, end time, and participants, including walking, speech, waiting, or transfer duration.

The scheduler compares the current activity with an explicit ordered collection of previously accepted activities. It reports an authored error through `ErrorCollector` at the current source line, identifying the shared character and conflicting activity. The first conflict in scheduling order is returned, making diagnostics deterministic. Only activities that pass validation are added to the accepted collection.

A failed activity scheduler may have temporarily changed the editable timeline. This is acceptable because a scheduling error discards that timeline; no rollback mechanism is needed.

### Zero-duration activities conflict only inside occupied intervals

A nonzero activity occupies the interval `[startTime, endTime)`. Two such intervals conflict when:

```text
first.startTime < second.endTime && second.startTime < first.endTime
```

An activity ending exactly when another begins does not overlap. A zero-duration activity is a point activity: it occupies no interval, but conflicts with a nonzero activity sharing a busy character or item when its timestamp is strictly inside `(startTime, endTime)`.

A point activity at the exact start or end of a nonzero activity does not conflict. Two point activities at the same timestamp also do not conflict. These boundary rules permit ordered instantaneous setup and teardown while preventing a participant's state from changing during an activity that depends on that state remaining stable.

### Effects do not reserve characters

Effects describe runtime presentation and ownership transitions; they are not scheduling records. Give, take, and drop retain their drawable effects and exact ownership-transfer boundaries. A give retains only the giver-owned drawable effect and does not create a handler-less receiver effect. Character availability therefore cannot accidentally depend on effect kind, duration, or placement.

### Speech uses the same availability rules

Generic activity availability handles a character overlapping their own speech, thought, or character-source emission with another activity. It also prevents zero-duration visibility or transformation changes from invalidating a speech source strictly during speech. Cross-character speech overlap is not a character-availability conflict and is permitted under ADR 016. Runtime earshot remains a presentation concern and does not define loading-time availability.

## Consequences

- Every new activity scheduler must explicitly declare its busy-character and busy-item policy.
- Missing participant declarations become scheduler contract failures instead of silently allowing overlap.
- Participation can cover a complete activity even when its visual effect covers only part of it.
- Point activities may establish state at an interval's start or change it at the interval's end, but may not change a shared busy participant strictly inside the interval.
- Multiple point activities may share a timestamp; their authored scheduling order determines the resulting state.
- Runtime effects contain only behavior needed for presentation or state transitions.
- Speech uses the same centralized availability check as other activities.
- Adding a new activity category does not require extending a central verb table or effect-kind reservation system.
