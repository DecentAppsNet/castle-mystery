# general

* activeCharacter=King
* time=0:00

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

* exits=West Hall

## West Hall

* exits=Sanctum|Foyer

```
............
.....Q......
..#......#..
............
............
..#......#..
............
............
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

* exits=Foyer|East Hall
* K=King
* J=Jester

## East Hall

* exits=Throne Room|Library
* obscured=true

## Foyer

* exits=West Hall|Throne Room|Library

## Library

```
.....
...Y.
.....
.X..B
```

* B=Romance Novel
* X=SW
* Y=NE

* exits=Foyer|East Hall

# characters

## King

* description=A tired ruler in a rumpled nightshirt, watching the house with anxious eyes.
* items=Sceptre | Dagger

## Jester

* description=A playful fellow, eager to please, smiling, yet always terrified.

## Queen

* description=A poised noblewoman whose careful posture hides a restless tension.

# items

## Sceptre

* description=A finely-crafted token of power, grimy, and scratched.
* displayChar=⚚

## Dagger

* description=An obligatory attempt at self-defense.
* displayChar=†

## Romance Novel

* title=Book
* description=A novel about shipwrecked lovers stranded on an island.
* displayChar=⌸

# itinerary

0:00:00 King @ Throne Room
0:00:00 King faces Jester
0:00:00 Jester @ Throne Room
0:00:00 Jester faces King
0:00:03 King says "It's good to be king."
: Jester says "Surely it must be a hardship, sire."
: King says "True. My mind is often filled with problems."
: Jester says "Sire, you seem to be grappling with some great problem now."
: King wanders
: King wanders
: King says "Where did I put that book?"
: King wanders
: King wanders
: King wanders
: King wanders
: King wanders
: King wanders
: Jester says "I shall help you search."
: King faces Jester
: Jester wanders
: Jester wanders
0:00:28 King says "It must be in the library."
0:00:29 Jester says "Shall I fetch it?"
0:00:30 King says "No."
0:00:34 King @ Library.SW
0:00:40 Jester @ West Hall

0:00:00 Queen @ West Hall
0:00:01 Queen wanders
0:00:30 Queen @ Library
0:00:31 Queen says "Hmm."
0:00:32 Queen takes Book
0:00:34 Queen @ Library.NE

King arrived in the library at 0:00:34.

0:00:35 King faces Queen
0:00:35 King says "Hello, dear."
0:00:35 Queen faces King
0:00:36 Queen says "Oh. Hi."
0:00:37 King says "Have you seen my favorite book?"
0:00:39 Queen says "No. Probably it is in the Throne Room."
0:00:41 King says "I searched there already."

0:00:44 Queen @ East Hall
0:00:46 King @ East Hall
0:00:50 King @ Throne Room
: King says "Where is that damned book?"

# solutions

* characters=King|Queen|Jester
* items=book|sceptre|dagger
* actions=searched|lied|looked

## The Missing Book

* clozeStatement=[King] [searched|looked] for a [book] in [Throne Room], but was unsuccessful. [King] went to [Library] next, where [Queen] [lied] to [King] about the [book].

## 
