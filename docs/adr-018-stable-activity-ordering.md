
## Status

Accepted

## Context

For several months, Castle Mystery was implemented with a "@" activity that allows an author to schedule movement of a character to arrive at a destination by a specified time. The activity was changed to merely assert a character is in a location at a time rather than to schedule the movement. A separate "goes" activity was added that allows scheduling movement that starts at a specified time rather than arrives at a specified time.

We had a lot of discussion and code changes to fix bugs in the first version of the "@" activity. There is a proof of a certain kind of bug always existing if back-planning is used for activities. This ADR is present to avoid revisiting back-planning functionality without at least designing deep enough to avoid problems.

The essential obstacle in making back-planning work is cyclic dependency:

1. Activity A needs to have Activity B scheduled before it has enough information to be scheduled.
2. Activity B needs to have Activity A scheduled before it has enough information to be scheudled.

The more specific example we worked on:

1. B is an @ activity with an absolute timestamp
2. A is an activity with absolute timestamp preceding B's
3. B's startTime (known after scheduling) precedes A's start time.
4. A's changes to editable timeline are needed for correct scheduling of B.

A solution we considered was aborting the scheduling of B, and redoing scheduling from a known good point with A preceding B.

It seems to work, but leaves edge cases where scheduling A before B points to a need to schedule B before A and visa-versa.

## Decision

Don't use back-planning for activities. The timestamp in an itinerary should always express when an activity begins.

Any scheduling logic should have predictable results considering the contract of how activities should work and not considering implementation details.

A concrete example of the above principle - the use of `Activity.endTime` for ordering activities for scheduling was removed. The previous rationale for keeping it was that if some future activity had `.endTime` specified, it might be a useful hint for putting activities in a useful order. The code was modified to only use `Activity.startTime` despite the potential usefulness of `Activity.endTime` in future scenarios, because `Activity.endTime` can't be a reliable ordering signal in every case. Better to have a clear limitation in the code than to have code that sometimes works.

## Rationale

While back-planning activities is possible, it is nearly impossible to eliminate cyclic dependency bugs.

Solutions that attempt to extract just what is needed from one dependency to fix a cyclic dependency run a risk of overlooking a needed piece of information. E.g., We know how long it takes for character A to arrive in room X. But if an extra item is dropped in room X by another activity, will it change that calculation?

The complexity of the code increases to deal with cyclic dependencies and makes it harder to maintain.

It's also confusing for authors to deal with a timestamp that sometimes means end time for an activity rather than start time.

## Consequences

- Current and future activities should use a timestamp to indicate the start time of an activity.
- Changes to scheduling logic should provide predictable results and follow a "this will always give predictable scheduling" standard rather than a "this will cover most cases and tend to be right" standard. If reaching that level of confidence is impractical, requirements can be changed to make scheduling logic simpler.