# general

* title=The Missing Book
* activeCharacter=King
* time=0:00
* winSynopsis=The King and Queen wanted to read the same book. She snatched the book and left it in the East Hall for a moment - just long enough for the jester to grab it. Fearing the King had no use for his courtside antics, the jester manipulated the King into watching him dance. The Jester's livelihood was safe for now.

# map

```
SSS
WTE
WTE
WFL
```

* S=Sanctum
* T=Throne Room
* W=West Hall
* E=East Hall
* F=Foyer
* L=Library

# rooms

## Sanctum

* exits=West Hall (lockable)

## West Hall

* exits=Sanctum|Foyer

```
............
.....Q......
..#......#..
............
............
..#......#..
.......N..D.
...........T
..#......#..
............
............
..#......#..
............
............
............
............
............
```

* Q=Queen
* D=Dagger
* N=NearDagger
* T=Table Note

## Throne Room

```
.......
.#...#.
...K...
.......
.......
.J.....
.......
.......
.......
.......
.......
```

* exits=Foyer (closed)|East Hall (closed)
* K=King
* J=Jester

## East Hall

* exits=Throne Room|Library
* obscured=true

## Foyer

* exits=West Hall|Throne Room|Library

## Library

```
G....
...Y.
.....
.X..B
```

* B=Book
* X=SW
* Y=NE
* G=Guide

* exits=Foyer|East Hall

# characters

## King

* description=A tired ruler in a rumpled nightshirt, watching the house with anxious eyes.
* items=Sceptre
* faceImage=/sprites/kingFace.png

## Jester

* description=A playful fellow, eager to please, smiling, yet always terrified.
* faceImage=/sprites/jesterFace.png

## Queen

* description=A poised noblewoman whose careful posture hides a restless tension.
* faceImage=/sprites/queenFace.png

# items

## Sceptre

* description=A finely-crafted token of power, grimy, and scratched.
* displayChar=⚚

## Dagger

* description=A bloody knife, left on the ground.
* displayChar=†

## Book

* title=Romance Novel
* description=A novel about shipwrecked lovers stranded on an island.
* displayChar=⌸

## Guide

* title=Guide
* description="A Guide to Delighting Royalty" - A reference work cataloging the potential ways a court servant may bring joy and amusement to their masters. The book is well-worn, containing bookmarks and scribbled notes.

## Table Note

* title=Note
* description=The note reads: "I never lied once in my life. Yet when I speak truth, they all call me a liar."
* displayChar=⌸

# itinerary

0:00:00 King @ Throne Room
0:00:00 Jester @ Throne Room
0:00:03 King says "(sigh)"
0:00:05 King says "Hmm."
: Jester says "You seem to be grappling with some great problem, Sire."
: King wanders
: King wanders
: King says "Where did I put that book?"
: King wanders
: King wanders
: King wanders
: Jester wanders
: Jester wanders
: Jester says "Perhaps, Sire, instead of reading your book..."
: Jester says "I shall entertain you with my dancing!"
: King says "Fool, I want my book!"
: King says "It must be in the library."
: Jester says "Shall I fetch it?"
: King says "No. But hold this heavy sceptre."
: King gives Sceptre to Jester
0:00:34 King @ Library.SW
0:00:40 Jester @ East Hall

0:00:00 Queen @ West Hall
0:00:01 Queen wanders
0:00:05 Queen @ West Hall.NearDagger
: Queen thinks "A Queen should not witness such untidiness."
: Queen wanders
0:00:10 Queen thinks "When one is bored, it is surely boring."
: Queen thinks "I shall look upon the tomes for alleviation."
0:00:30 Queen @ Library
0:00:31 Queen says "Hmm."
0:00:32 Queen takes Book
0:00:34 Queen @ Library.NE

King arrived in the library at 0:00:34.

0:00:35 King says "Hello, my beloved."
0:00:36 Queen interrupts "Oh. Hi."
0:00:37 King says "Have you seen my favorite book?"
0:00:39 Queen interrupts "No. Probably, you left it in the Throne Room."
0:00:41 King interrupts "I searched there already."

0:00:44 Queen @ East Hall
: Queen drops Book
0:00:45 Jester says "Thank you, your highness."
0:00:47 Queen @ Throne Room
0:00:48 Jester takes Book
0:00:49 Jester @ Throne Room
: Jester wanders
0:00:52 Queen @ Sanctum
: Queen thinks "I imagine he will destroy it. That is not my concern."

0:00:48 King @ Foyer
0:00:50 King @ Throne Room
: King says "Jester!"
: Jester says "Yes, Sire!"
: King says "I am without my book."
: Jester says "Sadly, Sire."
: King says "So you must frolic about with your silly dancing."
: Jester says "Gladly, Sire!"
: King says "And let us hope that suffices to entertain me."
: Jester wanders
: Jester wanders
: Jester wanders
: Jester wanders
: Jester wanders
: Jester wanders
: Jester wanders
: Jester wanders

# solutions

* actions=searched|lied|left|took

## Search for the Book

* unlockForItem=Book
* clozeStatement=The [King] [searched] for a [romance novel] in the [Throne Room], but was unsuccessful. The [King] went to the [Library] next, where the [Queen] [lied] to the [King] about the [romance novel].

## Possession of the Prize

* unlockForSolution=Search for the Book
* clozeStatement=The [Queen] [left] the [romance novel] in the [East Hall] after a small deception.---The [Jester] [took] it, returning to [Throne Room].


