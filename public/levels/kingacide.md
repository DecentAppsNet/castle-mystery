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
.......
.......
.......
.......
.......
.......
```

* exits=Foyer|East Hall
* K=King

## East Hall

* exits=Throne Room|Library

## Foyer

* exits=West Hall|Throne Room|Library

## Library

```
.....
.....
.X..B
```

* B=Romance Novel
* X=SW

* exits=Foyer|East Hall

# characters

## King

* description=A tired ruler in a rumpled nightshirt, watching the house with anxious eyes.
* items=Sceptre | Dagger

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
0:00:03 King says "It's good to be king."
0:00:10 King says "Where did I put that book?"
0:00:11 King wanders
: King wanders
: King wanders
: King wanders
: King wanders
: King wanders
0:00:30 King says "It must be in the library."
0:00:34 King @ Library.SW

0:00:00 Queen @ West Hall
0:00:01 Queen wanders
0:00:30 Queen @ Library
0:00:31 Queen says "Hmm."
0:00:32 Queen takes Book

King arrived in the library at 0:00:34.

0:00:35 King faces Queen.
0:00:35 King says "Hello, dear."
0:00:35 Queen faces King.
0:00:36 Queen says "Oh. Hi."
0:00:37 King says "Have you seen my favorite book?"
0:00:39 Queen says "No."

0:00:41 Queen @ East Hall

# solutions

## The Missing Book

* solution=[King|Queen] wanted to []
