# general

* activeCharacter=King
* time=0:00

# map

```
HL
```

* H=Hall
* L=Library

# rooms

## Hall

* exits=Library

```
....
.KJ.
....
```

* K=King
* J=Jester

## Library

* exits=Hall
* obscured=true

```
..Q.
..B.
....
```

* Q=Queen
* B=Romance Novel

# characters

## King

* description=A tired ruler in a rumpled nightshirt.

## Jester

* description=A nervous helper.

## Queen

* description=A poised noblewoman.

# items

## Romance Novel

* title=Book
* description=A misplaced book.

# itinerary

0:00:00 King @ Hall
0:00:00 Jester @ Hall
: Jester says "Surely it must be nearby."
: King says "Where did I put that book?"
0:00:00 Queen @ Library
0:00:05 Queen takes Book
0:00:06 King @ Library

# conclusions

* characters=King|Queen|Jester
* items=book|sceptre|dagger
* actions=searched|lied|looked

## The Missing Book

* clozeStatement=[King] [searched|looked] for a [book] in [Hall], then found [Queen] in [Library].
