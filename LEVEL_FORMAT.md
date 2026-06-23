# Overview

The level format is still changing as we build the engine, but enough things have settled that it makes sense to document the format. Both for someone authoring a level or an AI writing code.

The level file has these sections:
* general - top-level section for settings applicable to the level.
* map - describes the coarse room layout of the level as a tile grid, plus a legend mapping map letters to room names.
* rooms - gives per-room details such as room-local grids, exits, character placement, and item placement.
* characters - declares characters and their descriptive metadata, including which items they begin with.
* items - declares items and their display metadata.
* itinerary - authors time-based character activities such as movement, speech, thoughts, item interactions, and door changes.
* conclusions - declares the conclusion prompts and answers used by the mystery-solving UI.

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
* `groundFloorRoom` (optional) - identifies which room should define the level's ground-floor Y baseline. Accepts either room id or room title text. Default: the bottom edge of the full room bounds.
* `winSynopsis` (optional) - the text shown when the player completes the level. Default: `You completed the level.`

In practice, an author can think of these three fields as answering three questions:
* When does my story start? Use `startTime`.
* Where should the player begin on the slider? Use `time`.
* When does my story end? Use `endTime`.

`groundFloorRoom` is mainly useful for multi-level maps where vertical room placement matters. If provided, it must match an existing room (by id or title), otherwise level loading fails.

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
* an optional fenced grid showing the inside of the room. If present, it must match the room's expected dimensions exactly.
* a legend for people and items used inside that room

## Name/value Pairs

* `title` (optional) - the display name shown to the player. Default: the subsection name.
* `exits` (optional) - rooms directly connected to this one, separated by `|`. Default: no exits.
* `obscured` (optional) - whether the room begins hidden from the player. Default: `false`.

In the room grid:
* the fenced grid always has exactly 3 rows: back row, middle row, and front row
* the row count is fixed at 3, and the column count depends on the room width from the `map` section
* each map tile of room width contributes 4 columns to the room grid, so a 1-tile-wide room uses 4 columns, a 2-tile-wide room uses 8 columns, and so on
* `.` means empty walkable space
* `#` is ignored and behaves like empty walkable space
* any other letter must appear in the room legend

The 3 rows are interpreted like this:
* back row - the furthest row from the player
* middle row - the middle depth row
* front row - the closest row to the player

For authored placement, the column chooses horizontal position. The row chooses front-to-back depth. Characters and items do not use the row as a literal walking `y` target inside the room.

In the room legend:
* a known character name places that character in the room
* a known item name places that item in the room
* multiple known item names separated by `|` stack those items on one tile
* a stacked entry may end with one known character name, such as `Chair|Cushion|Hero`, which will result in the character being stacked on top of the items visually.
* a stacked entry may include at most one character, and if present it must be the final `|`-separated entry
* any other legend entry is an error

Example for a 1-tile-wide room:

```md
## Guard Room

```
....
.G..
K...
```

* G=Guard
* K=Purple Key
```

In that example:
* the first line is the back row
* the second line is the middle row
* the third line is the front row
* `Guard` begins in the middle row
* `Purple Key` begins in the front row

## Door Modifiers

In `exits`, a plain room name such as `Kitchen` creates an open doorway.

Adding modifiers in parentheses changes what kind of connection it is:
* `closed` or `open` creates a door
* `locked`, `unlocked`, `lockable`, or `unlockable` creates a lockable door
* `lockable with Item Name` or `unlockable with Item Name` creates a lockable door that requires that item to operate from this side

The supported modifiers are:
* `open` - the door starts open
* `closed` - the door starts closed
* `locked` - the lockable door starts locked
* `unlocked` - the lockable door starts unlocked
* `lockable` - the door can be locked or unlocked from this side
* `unlockable` - also marks the door as lockable from this side (interchangable with "lockable")
* `lockable with Item Name` - the door can be locked or unlocked from this side, but only by a character currently carrying the named item
* `unlockable with Item Name` - same as `lockable with Item Name`; `unlockable` and `lockable` are interchangeable here too

Modifiers from both sides are merged. That lets you control whether a lockable door can be operated from one side or both:
* put `lockable` or `unlockable` on one side only to make it operable from that side only
* put `lockable` or `unlockable` on both sides to make it operable from both sides
* add `with Item Name` on a side to require that item when operating the door from that side

The item named in `lockable with ...` or `unlockable with ...` must match an item defined in the `items` section. It can be written using either the item id form or the item title.

Examples:
* `Study` means an open doorway
* `Study (closed)` means a non-lockable closed door
* `Study (lockable, locked)` means a lockable door that starts locked and can be operated from this side
* `Study (lockable with Iron Key, locked)` means a lockable door that starts locked and requires `Iron Key` to operate from this side
* `Bedroom (locked, unlockable)` on one side and `Bedroom (locked)` on the other means the same locked door, operable from only the first side
* `Bedroom (locked, unlockable with Iron Key)` on one side and `Bedroom (locked)` on the other means the same locked door, operable only from the first side and only with `Iron Key`
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
.....
```

* H=Butler
* B=Master Key

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
* `alive` (optional) - whether the character begins alive. Must be `true` or `false`. Default: `true`.
* `facing` (optional) - which way the character initially faces. Must be `left` or `right`. Default: `right`.
* `orientation` (optional) - the character's initial body pose. Must be `standing`, `sitting`, or `laying`. Default: `standing`.
* `isTitleKnown` (optional) - `true` if the player should already know this character's identity when the level begins. Default: `false`.
* `visible` (optional) - whether the character is drawn at the start of the level. Must be `true` or `false`. Default: `true`. Use `show` and `hide` in the itinerary to change visibility over time.

This section defines the character, but it does not place them on the map. Character placement belongs in the `rooms` section.

## Example

```md
# characters

## Butler

* title=Edgar Flint
* description=A careful old servant who notices more than he says.
* items=Master Key|Notebook
* faceImage=butlerFace.png
* isTitleKnown=true

## Lady Marlowe

* description=The lady of the house, calm in public and furious in private.
```

## Initial Pose And Facing

The `characters` section can set a character's initial visual state before the itinerary changes it.

Examples:
* `* alive=false`
* `* facing=left`
* `* orientation=sitting`

These values control only the starting state. Later itinerary lines such as `faces left`, `sits`, `stands`, `lays`, or `dies` can change them over time.

# "Items" Section

The `items` section defines the objects that can appear in rooms or be carried by characters.

## What To Write

Write one subsection per item. The subsection name is the item's name.

## Name/value Pairs

* `title` (optional) - the display name shown to the player. Default: the subsection name.
* `description` (optional) - a short description of the item. Default: empty.
* `visible` (optional) - whether the item is drawn at the start of the level. Must be `true` or `false`. Default: `true`. Use `show` and `hide` in the itinerary to change visibility over time.

In practice, an author can think of this section as answering three questions:
* What is this object called? Use the subsection name and, if needed, `title`.
* What should the player learn when examining it? Use `description`.

This section defines the item, but it does not place the item anywhere. Item placement belongs in the `rooms` section, and starting carried items belong in the `characters` section.

## Example

```md
# items

## Master Key

* description=A heavy brass key that opens the servant passages.

## Torn Letter

* title=Half-Burned Letter
* description=A singed page with only a few lines still readable.
```

# "Itinerary Section"

## Overview

The `itinerary` section is where you script what characters do over time.

Each line usually describes one action for one character at one time. Different characters can have interleaved actions, so the file reads more like a story timeline than a per-character checklist.

Typical examples are:
* moving to a room
* moving to a precise floor position in a room
* speaking or thinking
* taking, dropping, or giving an item
* locking or unlocking a door

## Activity Format

Most lines use this shape:

`TIMESTAMP CHARACTER ACTIVITY`

Examples:
* `0:00:10 Butler says "Someone was here."`
* `0:00:20 Lady Marlowe @ Study`
* `: Butler takes Master Key`

You may also omit the `CHARACTER` part:

`TIMESTAMP ACTIVITY`

Examples:
* `0:00:05 says "Who am I?"`
* `: faces left`
* `: takes Master Key`

When the character is omitted, the loader uses the last character referenced earlier in the file. This follows file order, not chronological time order. If the first itinerary line in the file omits the character, the loader uses the level's `activeCharacter` from the `general` section.

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

Implied characters also follow file order. For example:
* `0:00:03 Steve @ Bakery`
* `0:00:05 faces right`
* `0:00:07 says "Boy, does it smell delicious in here!"`
* `0:00:06 Baker faces left`

In that example, the `:05` and `:07` lines both still refer to Steve, because Steve was the most recently referenced character earlier in the file at those lines. The later `Baker` line does not retroactively change the earlier implied character.

## Activities

The itinerary loader currently supports these activity verbs and forms:
* `@ Room` / `@ Room.50%` / `@ 50%`
* `says ...`
* `interrupts ...`
* `thinks ...`
* `Item emits ...`
* `faces left|right|Target`
* `stands`
* `sits`
* `kneels`
* `lays`
* `dies`
* `takes Item ...`
* `drops Item ...`
* `gives Item to Character`
* `locks Room`
* `unlocks Room`
* `show Character|Item`
* `hide Character|Item`
* `waits` / `waits seconds`

### @

`@ Room` means the character goes to a room. You can also target a floor waypoint by percentage with `@ Room.50%`.

`@ 50%` (without a room name) means "move within the current room" to the closest floor waypoint near that horizontal percentage.

`Room.50%` means: look at the room's floor waypoints, ignore any that are currently claimed by other characters if possible, and choose the one whose `x` position is closest to 50% of the room width. Any whole number from `0` through `100` is allowed.

Examples:
* `0:15:03 John @ Library`
* `0:15:03 John @ Library.0%`
* `0:15:03 John @ Library.50%`
* `0:15:03 John @ Library.100%`

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

### Emits

`Item emits "..."` emits text from an item instead of from a character.

Examples:
* `0:15:03 Bell emits "GONG"`
* `0:15:03 Master Key emits "clink"`

The emitted item can be on the floor or carried by a character.

### Faces

`faces ...` sets a character's facing direction.

Examples:
* `0:15:03 John faces left`
* `0:15:03 John faces right`
* `0:15:03 John faces Mary`
* `0:15:03 John faces Master Key`

When the target is a character or item, the facing direction is inferred from that target's position at that time.

### Body Orientation

These verbs set a character's body pose at the activity time:
* `stands`
* `sits`
* `kneels`
* `lays`

Examples:
* `0:15:03 John stands`
* `0:15:03 John sits`
* `0:15:03 John kneels`
* `0:15:03 John lays`

### Dies

`dies` marks the character as dead at that time.

Example: `0:15:03 John dies`

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

By default, a bare `takes Item` puts the item into the character's inventory, where it is not visible to the player.

You can also choose where the item goes:
* `takes Item in left hand`
* `takes Item in right hand`
* `takes Item in hand`
* `takes Item in inventory`

Examples:
* `0:15:03 John takes Note in left hand`
* `0:15:03 John takes Note in right hand`
* `0:15:03 John takes Note in inventory`

`in hand` means the right hand.

If the item is elsewhere in the room, the loader adds the needed walk first. The item can be referred to by its id or title. A `takes` activity can also move an item the character is already carrying between inventory and hand positions.

### Gives

`gives Item to Character` makes the character hand a carried item to another character in the same room.

Example: `0:15:03 John gives Note to Mary`

If the two characters are too far apart, the loader adds the short walk needed to get close enough first.

### Waits

`waits` delays that activity chain without creating a movement/speech/thought event.

Examples:
* `0:15:03 John waits`
* `0:15:03 John waits 2`
* `0:15:03 John waits 0.5`

If no duration is provided, `waits` defaults to 1 second. This only has an effect if the next activity line in the file has a relative timestamp (`:`). If the next activity line has an absolute timestamp (`0:00:00`), the wait activity will be ignored in favor of the timestamp.

### Show

`show Character|Item` makes a character or item visible at that time.

Examples:
* `0:15:03 John show Bookcase`
* `0:15:03 John show Mary`

The target can be an item or a character, referenced by name or id. The change takes effect at the given timestamp and is reflected when the player scrubs to that time.

### Hide

`hide Character|Item` makes a character or item invisible at that time.

Examples:
* `0:15:03 John hide Bookcase`
* `0:15:03 John hide Mary`

Like `show`, the target can be an item or a character. An invisible character or item is completely excluded from drawing. Use `visible=false` in the `characters` or `items` section if you want a character or item to start invisible before the timeline has a chance to show it.

# "Conclusions" Section

The `conclusions` section controls the answer panels shown in the mystery-solving UI.

Keep this section simple: each conclusion is usually a sentence with one or more blanks.

## What To Write

The section can contain:
* optional category lists at the top
* one subsection per conclusion

Category lists are useful for populating blanks with options. Category lists for characters, rooms, and items are automatically generated.

## Category Lists

Write category lines before any `##` conclusion subsections.

Format:
* `* category name=Option 1|Option 2|Option 3`

When a blank's correct answer or answers all appear in one of these categories, the whole category becomes the answer list for that blank.

Example:

```md
# conclusions

* people=King|Queen|Butler
* rooms=Library|Kitchen|Study
```

## Conclusion Subsections

Write one `##` subsection per conclusion.

Useful lines inside a conclusion subsection:
* `* conclusion=...` - the cloze sentence that must be solved by the player
* `* title=...` - optional display title; default is the subsection name
* `* revealRooms=Room A|Room B` - optional; completing this conclusion reveals the named rooms
* `* unlockConclusions=Conclusion A|Conclusion B` - optional; completing this conclusion unlocks the named conclusions

`revealRooms` can match room ids or room titles. `unlockConclusions` can match conclusion ids or conclusion titles.

Conclusions named by `unlockConclusions` begin locked until one of their prerequisite conclusions is completed.

## Writing Blanks

Put a blank answer inside square brackets:
* `[Butler]` - one correct answer
* `[searched|looked]` - multiple correct answers

Answers inside a blank are separated by `|`.

If the blank matches one of your categories, the player will see that category's full answer list. If it does not match any category, the player will only see the correct answer or answers.

## Images And Separators

Inside a `conclusion=` line, you can also use:
* `(imageFileName.png)` for an image
* `---` for a visual separator between parts

Image references are authored as filenames, not paths. The engine resolves them against the supported asset folders at load time.

This is most useful for identity-style conclusions.

## Secret Identities

The engine automatically generates an `Identities` conclusion when the level has characters.

If you want to customize only the metadata for that generated conclusion, add an `## identities` subsection without a `conclusion=` line. In that special case, the generated identity blanks are kept, while authored metadata such as `title`, `revealRooms`, and `unlockConclusions` is applied.

If you do author a `conclusion=` line inside `## identities`, that authored conclusion replaces the generated one.

## Example

```md
# conclusions

* people=King|Queen|Butler
* actions=searched|looked|hid

## The Missing Book

* title=The Missing Book
* revealRooms=Library
* unlockConclusions=Secret Identities
* conclusion=[Butler] [searched|looked] the Library.

## Secret Identities

* conclusion=(kingFace.png) = [King] --- (queenFace.png) = [Queen]

## identities

* revealRooms=Study|Vault
* unlockConclusions=Final Accusation
```