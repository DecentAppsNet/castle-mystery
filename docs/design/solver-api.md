# Solver API

## Background

Peter made a Claude-based level solver that worked great. But as Castle Mystery evolved, needs changed.

The main difference is that level files contain information that a player would not necessarily know at different points in play. While the original solver did well with receiving the entire level file as an input, it shouldn't really know all of the information in the level file.

The second difference is that we'll have more graph traversal puzzles involving doors, movements between rooms, and disguises. While high-end frontier models do a reasonable job of analyzing these, deterministic code that models graphs for room state will do a better job.

We've also got Castle Mystery to a more mature place where very few, if any, new features to level mechanics need be added or revised.

## Goals

* Decouple the solver from CM implementation by providing an API.
* Give the solver just what information is known to the player at different points in level progression.
* Filter out cosmetic and solution-irrelevant information that doesn't contribute toward solving.
* Allow the solver to guess conclusions without knowing answers beforehand. This prevents its guesses or intermediate logic from being biased with knowledge of the correct answer.
* Allow the solver to progress to states in the same level where more is known based on claiming correct conclusions.

## Design

### Level for Solving API

Syntax: `npm run level-for-solving LEVEL_FILENAME [CONCLUSION1_ID...]`
Example: `npm run level-for-solving black-brick.md`
Example #2: `npm run level-for-solving black-brick.md identities "Collapse of a Tower"`

The return is STDOUT.

If no errors, returns filtered version of level file that shows only solution-contributing information available to the player after any specified conclusions are claimed.

If there is an error, returns a line that starts with "FAILED" and then describes the problem.

### Confirm Conclusion API

Syntax: `npm run confirm-conclusion LEVEL_FILENAME CONCLUSION_ID CONCLUSION_ANSWERS`
Example: `npm run confirm-conclusion black-brick.md "Collapse of a Tower" "[Toro] [pillar] [Hugo] [goaded] [Arabic Tower] [fall]".

Returns "CONFIRMED" if claimed conclusion was correct.

Returns "INCORRECT" followed by the correct answers if claimed conclusion was incorrect. The agent harness can decide if the correct answers will be shown to agent. It may be useful for the agent to make multiple guesses without knowing the answer. Or the agent may be performing analysis on what the gap is between what it can deduce and what is expected to find the solution, in which case, providing it the answer is useful.

Returns "FAILED" followed by problem description if there was an error.

### Level Filtering

These fields/sections are *always* filtered out because they don't contribute information toward solving.

* # general -> activeCharacter
* # general -> background
* # general -> groundFloor
* # general -> imports (though these are taken into account for including imported data in the returned level data)
* # general -> initialTime
* # general -> winSynopsis
* # roomStyles
* # rooms -> ## room ID -> roomStyle
* # rooms -> ## room ID -> *Texture (any of the settings for textures are filtered)
* # characters -> ## character ID -> isTitleKnown (though this value is used for filtering/replacing ID and title of characters)
* # characters -> ## character ID -> faceImage
* # characters -> ## character ID -> ### appearance ID (though this value is used for generating placeholder IDs)
* # characters -> ## character ID -> isVisible (if character isn't visible, character section would have been filtered - see next section)
* # items -> ## item ID -> image
* # items -> ## item ID -> drawOffset*
* # items -> ## item ID -> stackOffset*
* # items -> ## item ID -> isVisible (if item isn't visible, item section would have been filtered - see next section)
* # conclusions -> categories (the available answers will be represented in conclusion field - see next section)

These fields/sections are not always filtered, but might be filtered or modified based on specific criteria/logic.

* # rooms -> ## room ID -> items (set to "this obscured room may contain none or any number of items")
* # characters -> ## character ID (section entirely removed if character is not visible to player at any point in the timeline)
* # characters -> ## character ID (set to placeholder ID if character is visible, but title not known)
* # characters -> ## character ID -> title (set to placeholder ID if visible character title not known)
* # characters -> ## character ID -> items (set to "N hidden items" where N is the count of items)
* # items -> ## item ID (section entirely removed if item is not visible to player at any point in the timeline)
* # itinerary (all activities occuring inside obscured rooms are filtered)
* # conclusions -> ## conclusion ID (section entirely removed if conclusion has been solved or it has not been revealed)
* # conclusions -> ## conclusion ID -> conclusion (the unmodified conclusion is shown. Otherwise, each cloze blank has a list of all answers from categories that could be used in the blank.)
* # solved conclusions -> ## conclusion ID (new section contains only solved conclusions)
* # solved conclusions -> ## conclusion ID -> conclusion (the unmodified conclusion is shown with correct answers is shown, including multiple correct answers if available.)

Comments are any text appearing in the markdown that isn't a section or name/value pair. These won't be filtered. They can be used to describe in text some extra information that would be available to the player, but the level file would not otherwise indicate. The agent can use this for solving. Example below:

```
11:00:48 Marty takes Sarcophagus Lid in left hand
(with the lid removed, a skeleton is visible inside the sarcophagus)
```

...another example that left the first solver missing an identity clue in House of Rocks...

```
Character #3 stands next to the Stonecutting station, performing work.
```

### Character Identities and Placeholders

The unmodified itinerary gives away identities of characters. It's kind of like when you're watching a movie with subtitles and the subtitles tell you the name of a character before the story does.

So if a character does not have the "isTitleKnown=true" field in the level file, and the "identities" conclusion is not claimed in the call to "level-for-solving" API, then that character ID will be replaced with a placeholder name in the API-returned level.

The replacement character ID would be in the form "Character #X". If the character has a description field, there should be more information available to the solver agent about character appearance that gives a similar amount of information as a player would receive, e.g. gender, clothing.

Disguises/appearances create another nuance. In the game, there can be "appears" activities that change the appearance of a character, e.g. `: Niccolo appears as Niccolo-Masked`. During gameplay, if any "appears" activity occurs in an unobscured room, the player is allowed to see a continuous progression between both states when sliding along the timeline. Otherwise (no "appears" activity occurs in an unobscured room), the same character is portrayed to the player as two separate characters, because the player has not seen the proof that it is actually one character with two different appearances.

To mirror the player experience, distinct placeholder IDs are used for the same character when there is no visible "appears" activity to provide proof that it is the same character. So in the output level, we can have a "Character #1" enter an obscured room, and a "Character #2" leave the same obscured room, despite them being the same character. The solving agent may unobscure the room where a disguise is donned with a new call to "level-for-solving" API that passes a claimed conclusion that reveals that room. And then the output level will use the same character ID for the character despite a different appearance.

Appearance IDs are replaced in the itinerary so their IDs don't give any clues. So the previous itinerary line might be output like `: Character #4 appears as Appearance #2`. If the appearance section has a description field, that description is included in the modified itinerary line as well, e.g. `: Character #4 appears as Appearance #2 ("A man wearing a comically gruesome ox mask, obscuring his face.")`. If important visual information is conveyed to the player, an authored comment beneath the itinerary line can provide more context, e.g. "The ox mask looks the same as the mask found in the antechamber earlier."

# Open Questions

## Is Markdown or JSON better?

Option #1 - Just return modified markdown of the level. The previous description of modifying to hide player-unknown information was written based on this approach.

Option #2 - Return a JSON representation of the parsed level that follows the same principles for modifying to hide player-unknown information.

`export type SolvableLevel = {
  rooms:Room[],
  characters:Character[], 
  discoveryConfig:DiscoveryConfig,
  conclusions:Conclusion[],
  activities:Activity[]
}`

I suspect the prose style of the markdown format lends itself well to LLM-based reasoning though.

Option #3 - Just provide JSON for the room layout, including doors in addition to the markdown description.

