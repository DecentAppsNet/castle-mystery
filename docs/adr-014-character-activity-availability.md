# ADR 014: Character Activity Availability

## Status

Accepted

## Context

Level loading must reject timelines in which one character participates in multiple nonzero-duration activities at the same time. Previously, some availability rules were inferred from runtime effects. Item transfers, for example, searched for active transfer effects, and a give created a handler-less effect on the receiver solely to reserve that character.

That approach mixed authoring validation with presentation state. It also made availability operation-specific: each handler needed to know which effects represented a busy character. Effects can cover only part of an activity, while participation can cover more. A give receiver, for example, participates while the giver approaches as well as while the item is animated.

Activity syntax determines participation. The receiver of a give participates, but a character named as a drop location, facing target, or speech listener does not necessarily participate. This meaning belongs with the handler that interprets each activity.

## Decision

### Activities own loading-time availability

`Activity.busyCharacterIds` is the source of truth for character availability while loading a level. It is loading-only state and is not copied into the runtime timeline, characters, keyframes, or effects.

Each activity handler explicitly derives its busy participants from normalized parsed parts. There is no generic default. An empty array is valid for an item-only activity, while `null` means that the handler has not yet fulfilled its scheduling contract.

This keeps syntax-specific policy beside syntax-specific scheduling. For example, `gives` declares both giver and receiver busy, while `drops` declares only its subject busy.

### The scheduler enforces conflicts centrally

The central scheduler validates availability after a handler succeeds. At that point the handler has resolved the activity's actual start time, end time, and participants, including walking, speech, waiting, or transfer duration.

The scheduler compares the current activity with an explicit ordered collection of previously accepted activities. It reports an authored error through `ErrorCollector` at the current source line, identifying the shared character and conflicting activity. The first conflict in scheduling order is returned, making diagnostics deterministic. Only activities that pass validation are added to the accepted collection.

A failed handler may have temporarily changed the editable timeline. This is acceptable because a scheduling error discards that timeline; no rollback mechanism is needed.

### Intervals are half-open and zero-duration activities occupy no time

A nonzero activity occupies the interval `[startTime, endTime)`. Two such intervals conflict when:

```text
first.startTime < second.endTime && second.startTime < first.endTime
```

An activity ending exactly when another begins does not overlap. Activities whose start and end times are equal are explicitly excluded from conflicts, including when their timestamp falls inside a longer activity. This permits instantaneous state changes without weakening nonzero activity participation rules.

### Effects do not reserve characters

Effects describe runtime presentation and ownership transitions; they are not scheduling records. Give, take, and drop retain their drawable effects and exact ownership-transfer boundaries. A give retains only the giver-owned drawable effect and does not create a handler-less receiver effect. Character availability therefore cannot accidentally depend on effect kind, duration, or placement.

### Speech retains separate cross-character rules

Generic activity availability handles a character overlapping their own speech, thought, or character-source emission with another nonzero activity. Speech keeps a separate rule for incompatible speech by other audible characters because that rule depends on earshot, room connections, movement, and intentional exemptions for thoughts and emissions. Those auditory rules explicitly exclude the current speaker and do not define character availability.

## Consequences

- Every new activity handler must explicitly declare its busy-participant policy.
- Missing participant declarations become scheduler contract failures instead of silently allowing overlap.
- Participation can cover a complete activity even when its visual effect covers only part of it.
- Exact boundaries and zero-duration state changes have consistent behavior across all activity categories.
- Runtime effects contain only behavior needed for presentation or state transitions.
- Cross-character auditory validation remains specialized without duplicating same-character availability checks.
- Adding a new activity category does not require extending a central verb table or effect-kind reservation system.
