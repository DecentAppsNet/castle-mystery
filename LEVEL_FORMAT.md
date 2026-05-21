# Overview

The level format is still changing as we build the engine, but enough things have settled that it makes sense to document the format. Both for someone authoring a level or an AI writing code.

The level file has these sections:
* general - top-level section for settings applicable to the level.
* map - describes the coarse room layout of the level as a tile grid, plus a legend mapping map characters to room names.
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
* a legend that says which room each map character stands for

Each non-`.` character in the grid represents a room. All matching characters belong to the same room. `.` means empty space. The size and shape of the room will match by scale what you put in the grid. Rooms must be rectangular (not L-shaped, for example).

In practice, an author can think of this section as answering two questions:
* Where are the rooms on the overall map? Put them in the text grid.
* Which room does each map character mean? Add it to the legend.

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
* isTitleKnown=false

## Lady Marlowe

* description=The lady of the house, calm in public and furious in private.
* isTitleKnown=true
```
