# Overview

The level format is still changing as we build the engine, but enough things have settled that it makes sense to document the format. Both for someone authoring a level or an AI writing code.

The level file has these sections:
* general - top-level section for settings applicable to the level.
* map - describes the coarse room layout of the level as a tile grid, plus a legend mapping map letters to room names.
* rooms - gives per-room details such as room-local grids, exits, character placement, item placement, and position markers.
* characters - declares characters and their descriptive metadata, including which items they begin with.
* items - declares items and their display metadata.
* itinerary - authors time-based character activities such as movement, speech, thoughts, item interactions, and door changes.
* solutions - declares the solution prompts and answers used by the mystery-solving UI.

# Syntax Style - Forgiving and Protective

The syntax style is designed with these goals in mind:
* be forgiving of the various ways an author can express their intent
* where it is clear that data in the level file would cause a problem, fail the level load with an error message that will be helpful to the author, even giving instruction on how to fix.
* if forgiving syntax parsing leads to an ambiguity of what the author intends, the syntax should be made stricter
* if forgiving syntax parsing leads to complicated parsing code, the syntax should be made stricter

Examples of forgiving syntax parsing:
* white space can be of any length between different tokesn or omitted
* sentence punctuation that an author might accidentally include in the English-sentence-like itinerary commands is allowed and ignored
* case insensitivity for matching room/item/character name references

Examples of syntax parsing that is too forgiving:
* a misspelled character name is matched against the closest-matching name
* correcting the times of itinerary events on author's behalf to resolve a loading error

To sum up, when parsing the level file, we try a little (not a lot) to interpret and realize the author's intent across varied input. And when we can't interpret or realize the author's intent, we are loud and helpful about the failure.

# "General" Section

The `general` section contains top-level name/value settings for the level.

## Name/value Pairs

* `title` (required) - the display name of the level.
* `activeCharacter` (optional) - the character selected when the level first opens. Default: the first loaded character; if no characters exist, level loading fails.
* `startTime` (optional) - the earliest time that the level uses when describing when events occur. Default: derived from `time` or the itinerary when possible, otherwise `0:00`.
* `time` (optional) - the time shown on the slider when the player first begins the level. Default: `startTime`.
* `endTime` (optional) - the latest time that the level uses when describing when events occur. Default: derived from the itinerary when possible, otherwise the resolved `startTime`.
* `winSynopsis` (optional) - the text shown when the player completes the level. Default: `You completed the level.`

In practice, an author can think of these three fields as answering three questions:
* When does my story start? Use `startTime`.
* Where should the player begin on the slider? Use `time`.
* When does my story end? Use `endTime`.

If a level crosses midnight, write the times the way a person normally would. For example, `startTime=19:30` and `endTime=07:00` means the level starts in the evening and ends the next morning.


## Example

```md
# general

* title=Feast of Poison
* activeCharacter=King
* startTime=8:30:00
* time=8:45:00
* endTime=11:00:00
* winSynopsis=You discovered who poisoned the feast.
```

# "Map" Section

The `map` section gives the broad layout of the level. Think of it as a simple floor plan made from text.

## What To Write

The section has two parts:
* a text grid showing the overall shape of the map
* a legend that says which room each map letter stands for

Each non-`.` letter in the grid represents a room. All matching letters belong to the same room. `.` means empty space. The size and shape of the room will match by scale what you put in the grid. Rooms must be rectangular (not L-shaped, for example).

This section is for the large-scale layout of the level, not the detailed inside of each room. Room interiors and connecting information belong in the `rooms` section.

## Example

```md
# map

AAA..
BBBCC
BBBCC

* A=Kitchen
* B=Hall
* C=Library
```

# "Rooms" Section

The `rooms` section fills in the inside of each room.

## What To Write

Write one subsection per room. The subsection name must match a room from the `map` legend.

Each room subsection can contain:
* room-level settings such as `title`, `exits`, and `obscured`
* an optional fenced grid showing the inside of the room. It need not match any exact dimensions, but will instead be scaled to match the size of the room as defined in the map section.
* a legend for people, items, and named position markers used inside that room

## Name/value Pairs

* `title` (optional) - the display name shown to the player. Default: the subsection name.
* `exits` (optional) - rooms directly connected to this one, separated by `|`. Default: no exits.
* `obscured` (optional) - whether the room begins hidden from the player. Default: `false`.

In the room grid:
* `.` means empty walkable space
* `#` means an obstruction
* any other letter must appear in the room legend

In the room legend:
* a known character name places that character in the room
* a known item name places that item in the room
* any other legend entry becomes a named position marker that can be used in itinerary lines such as `@ Kitchen.Window`

## Door Modifiers

In `exits`, a plain room name such as `Kitchen` creates an open doorway.

Adding modifiers in parentheses changes what kind of connection it is:
* `closed` or `open` creates a door
* `locked`, `unlocked`, `lockable`, or `unlockable` creates a lockable door

The supported modifiers are:
* `open` - the door starts open
* `closed` - the door starts closed
* `locked` - the lockable door starts locked
* `unlocked` - the lockable door starts unlocked
* `lockable` - the door can be locked or unlocked from this side
* `unlockable` - also marks the door as lockable from this side (interchangable with "lockable")

Modifiers from both sides are merged. That lets you control whether a lockable door can be operated from one side or both:
* put `lockable` or `unlockable` on one side only to make it operable from that side only
* put `lockable` or `unlockable` on both sides to make it operable from both sides

Examples:
* `Study` means an open doorway
* `Study (closed)` means a non-lockable closed door
* `Study (lockable, locked)` means a lockable door that starts locked and can be operated from this side
* `Bedroom (locked, unlockable)` on one side and `Bedroom (locked)` on the other means the same locked door, operable from only the first side
* `Bedroom (lockable, locked)` on one side and `Bedroom (locked, unlockable)` on the other means a locked door operable from both sides

If both sides mention the same connection, they should describe the same door. Conflicting states such as `locked, open` cause a load error.

## Example

````md
# rooms

## Hall

* exits=Kitchen|Study (lockable, locked)

```
..B..
..#..
..H..
..W..
```

* H=Butler
* B=Master Key
* W=Window

## Kitchen

* obscured=true
````

# "Characters" Section

The `characters` section defines who the people in the mystery are.

## What To Write

Write one subsection per character. The subsection name is the character's name.

## Name/value Pairs

* `title` (optional) - the display name shown to the player. Default: the subsection name.
* `description` (optional) - a short description of the character. Default: empty.
* `items` (optional) - items the character begins with, separated by `|`. Default: no starting items.
* `faceImage` (optional) - the image used for the character's face in the UI. Default: no face image.
* `isTitleKnown` (optional) - `true` if the player should already know this character's identity when the level begins. Default: `false`.

In practice, an author can think of this section as answering three questions:
* Who is this person? Use the subsection name and, if needed, `title`.
* What should the player know about them? Use `description`.
* What do they begin with? Use `items`.

This section defines the character, but it does not place them on the map. Character placement belongs in the `rooms` section.

## Example

```md
# characters

## Butler

* title=Edgar Flint
* description=A careful old servant who notices more than he says.
* items=Master Key|Notebook
* faceImage=/sprites/butlerFace.png
* isTitleKnown=true

## Lady Marlowe

* description=The lady of the house, calm in public and furious in private.
```

# "Items" Section

The `items` section defines the objects that can appear in rooms or be carried by characters.

## What To Write

Write one subsection per item. The subsection name is the item's name.

## Name/value Pairs

* `title` (optional) - the display name shown to the player. Default: the subsection name.
* `description` (optional) - a short description of the item. Default: empty.
* `displayChar` (optional) - the single character used to draw the item in the UI. Default: the first character of the subsection name, or `?` if there is none.

In practice, an author can think of this section as answering three questions:
* What is this object called? Use the subsection name and, if needed, `title`.
* What should the player learn when examining it? Use `description`.
* What should represent it visually in the UI? Use `displayChar`.

This section defines the item, but it does not place the item anywhere. Item placement belongs in the `rooms` section, and starting carried items belong in the `characters` section.

## Example

```md
# items

## Master Key

* description=A heavy brass key that opens the servant passages.
* displayChar=⚷

## Torn Letter

* title=Half-Burned Letter
* description=A singed page with only a few lines still readable.
* displayChar=✉
```

# "Itinerary Section"

## Overview

The `itinerary` section is where you script what characters do over time.

Each line usually describes one action for one character at one time. Different characters can have interleaved actions, so the file reads more like a story timeline than a per-character checklist.

Typical examples are:
* moving to a room
* speaking or thinking
* wandering inside a room
* taking, dropping, or giving an item
* locking or unlocking a door

## Activity Format

Most lines use this shape:

`TIMESTAMP CHARACTER ACTIVITY`

Examples:
* `0:00:10 Butler says "Someone was here."`
* `0:00:20 Lady Marlowe @ Study`
* `: Butler takes Master Key`

There are two kinds of timestamps:
* an absolute timestamp such as `0:00:10`, which places the activity at a specific time
* a relative timestamp written as `:`, which means "after this character's previous authored activity finishes".

Relative timestamps are useful when you want one action to wait for the previous one without calculating the exact time yourself.

Absolute-timestamp lines do not have to be written in time order. The loader reorders them correctly by time when the level loads.

This is useful when you want to group together a set of activities that happen at the same moment but involve different characters. In practice, that often makes the itinerary easier to read and edit.

## Crossing Midnight

If the level crosses midnight, write the itinerary times the way a person normally would.

For example, in a level with `startTime=19:30`, an itinerary line such as `0:15:00 Butler says "The house is quiet."` is treated as the next day, not earlier that same evening.

In other words, absolute itinerary times earlier than the level's `startTime` are understood as after midnight when the level timeline crosses over into the next day.

Note that the itinerary can't be longer than 24 hours. Or rather, you have no way of specifying a time outside the range of 0:00:00 to 23:59:59. So even if you intend an activity to occur outside of one 24-hour period, the level loader will always interpret your times inside of one 24-hour period.

## File Order And Time Order

Absolute timestamps are reordered by time when the level loads, so these two lines can appear in either order in the file:
* `0:00:10 Butler says "Someone was here."`
* `0:00:20 Lady Marlowe @ Study`

Relative `:` timestamps are different. They follow the immediately previous authored activity in the file, even if that previous line belongs to a different character.

That means file order is still important when you use `:`. A common pattern is to group a short multi-character exchange together in the file and use `:` to make each line follow the one above it.

## Activities

### @

`@ Room` means the character goes to a room. You can also target a named position marker with `@ Room.Marker`.

Example: `0:15:03 John @ Library.Window`

This is the one activity where an absolute timestamp means when the character should finish an activity (walking to a room, in this case), not when they should start the activity. The loader plans movement so the character reaches the destination by that time.

With a relative timestamp `:`, the walk starts as soon as the character's previous activity has finished.

### Says

`says "..."` makes the character speak. The text may be quoted or unquoted, though quotes are usually clearer.

Example: `0:15:03 John says "I found the note."`

Use `says` for normal speech. A `says` line cannot start while another audible character is already speaking.

`interrupts "..."` is the overlapping-speech version. Use it when talking over another speaker is intentional.

Example: `0:15:04 Mary interrupts "Wait."`

### Thinks

`thinks "..."` creates an internal thought. Like speech, the text may be quoted or unquoted.

Example: `0:15:03 John thinks "This does not look right."`

Thoughts are private. They do not need to respect audible speech in the room, but one character still cannot overlap their own thought lines.

### Locks

`locks Room` makes the character lock the exit from their current room to the named adjacent room.

Example: `0:15:03 John locks Study`

If the character is not already near that exit, the loader adds the short walk needed to reach it first.

### Unlocks

`unlocks Room` is the matching action for a lockable exit to the named adjacent room.

Example: `0:15:03 John unlocks Study`

Like `locks`, this only works from the side of the door where locking or unlocking is allowed.

### Drops

`drops Item` makes the character drop a carried item in their current room.

Example: `0:15:03 John drops Note`

The item can be referred to by its id or title.

### Takes

`takes Item` makes the character pick up an item from the current room.

Example: `0:15:03 John takes Note`

If the item is elsewhere in the room, the loader adds the needed walk first. The item can be referred to by its id or title.

### Gives

`gives Item to Character` makes the character hand a carried item to another character in the same room.

Example: `0:15:03 John gives Note to Mary`

If the two characters are too far apart, the loader adds the short walk needed to get close enough first.

### Wanders

`wanders` makes the character take one small step to a nearby waypoint in their current room.

Example: `0:15:03 John wanders`

This is useful for background motion when you do not care about the exact destination.