# ADR 019: Speech Effect Visibility

## Status

Accepted

## General Principles for Speech Observability

These principles imply many but not all requirements for when speech can be observable (rendered with a speech bubble).

* In the game, there is an active character, and the player is generally allowed to observe what the active character could observe. For example, the thoughts of the active character are observable, since they are known to the character themself. But the thoughts of another character aren't visible by the active character.
* An exception to the above principle is when the level is complete, and the player is granted an ability to observe all speech happening everywhere. In this case, it is like the observer changes from the active character to the player, who has been given omniscience as a reward for completing the level.
* Audibility is a subset of observability covering "says" and "emits", but not "thinks". Thinking has no audibility, because the associated speech has no ability to be heard by other characters. 
* The game uses simplified rules for when speech is audible to aid the player in grasping what happens in the game and what deductions can be made. If we say that speech in the same room is always audible, the player need not consider if a large cabinet in the middle of a room is blocking audibiity between left and right sides of the room. Another example of a simplified rule is the "loudly" modifier for "emits" activities - a loud emission has audibility throughout the entire level without regard to distance, room topology, or doors. We could add logic to model sound transmission more like the real world, but that would go against the principle of having understandable rules for the player.
* When rooms are obscured, they obscure the ability of the active character to observe speech. There are other consequences of obscuring a room, but here we're just stating the speech observability consequences. Note that obscured rooms do nothing to inhibit the sources of speech. So if someone is speaking within an obscured room, we might suppress a speech bubble, but only if the active character is inside an obscured room. Obscured rooms only suppress observation of the active character - they do not suppress the source of speech.
* Characters or items that are hidden or unplaced can't be used as sources of speech. The rationale for this is favoring understandability for the player.

## Requirements

Each active speech effect is either observable or unobservable from the current observer's perspective. An observable effect renders exactly one bubble. Whether that bubble is attached to its source or rendered unattached elsewhere is a presentation choice made after observability has been established; attached and unattached rendering do not define separate audibility rules.

During ordinary play, the active character is the observer. Completing the level makes the player omniscient: all valid active speech effects throughout the level become observable. Completion may change a bubble's placement, but must not hide speech that the completed-level observer is entitled to observe.

If the active character's room is obscured during ordinary play, no speech effect is observable. Obscurity in a source room other than the active room does not by itself prevent that source's audible speech from being observed.

Characters and items must be visible and placed at the time they are used as speech sources. A speech activity with a hidden or unplaced source is invalid rather than merely unobservable.

### `says`

During ordinary play, `says` is observable when all of the following are true:

- the active character's room is not obscured;
- the speaker is in the active character's room, or in a room connected to it by an open exit; and
- the speaker is a valid visible, placed source.

Speech in the same room is always audible without regard to positions or obstacles within that room. Speech in an adjacent room is audible only through an open exit. Obscurity in the speaker's room does not suppress otherwise audible speech unless that room is also the active character's room.

When the speaker is presented in the active room, the bubble should be attached to the speaker. Speech heard from an adjacent room should be rendered unattached near the connecting exit. These placement rules must not cause duplicate bubbles.

When the level is complete, every valid active `says` effect in the level is observable. Its bubble should be attached to its presented speaker regardless of which room contains the speaker.

### `thinks`

Thoughts are observable but never audible. During ordinary play, a `thinks` effect is observable only when:

- the thinking character is the active character;
- the active character's room is not obscured; and
- the active character is a valid visible, placed source.

The thought bubble should be attached to the active character. Another character's thoughts are not observable during ordinary play, even when that character is visible in the active room. Thoughts have no adjacent-room or other audibility-based presentation.

When the level is complete, every valid active `thinks` effect in the level is observable and should be attached to its presented thinker.

### `emits`

An `emits` source may be a visible character, a visible floor item, or a visible item held by a character. Inventory items, hidden sources, and unplaced sources are invalid.

During ordinary play, a non-loud `emits` effect is observable when all of the following are true:

- the active character's room is not obscured;
- the source is in the active character's room, or in a room connected to it by an open exit; and
- the source is valid and placed.

As with `says`, a non-loud emission in the same room is always audible, while an adjacent-room emission requires an open exit. Obscurity in the source room does not suppress an otherwise audible emission unless the source room is also the active character's room.

During ordinary play, a loud `emits` effect from a valid source is observable from every room, without regard to distance, room topology, or door state. An obscured active room still suppresses observation of a loud emission because obscurity limits the observer rather than the source.

When the source is presented, both loud and non-loud emission bubbles should be attached to that source. Otherwise, an observable non-loud emission should be rendered unattached near the connecting exit. An observable loud emission should be rendered unattached near the top center of the active room, with a tip indicating the source room's approximate direction when the source is in another room. These placement choices must not change whether the emission is observable or produce duplicate bubbles.

When the level is complete, every valid active `emits` effect in the level is observable. Each effect still renders exactly one bubble; omniscience does not require rendering a copy in every room.
