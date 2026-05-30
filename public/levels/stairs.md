# general

* title=Stairs Test
* activeCharacter=Simon
* time=0:00
* winSynopsis=Stairs.

# map

```
...........
.A.DEFGIIJ.
.ABD.F.IIK.
.ACD.FHII..
...........
```

* A=Stairwell
* B=Library
* C=Hallway
* D=Stairwell 2
* E=Foyer
* F=Stairwell 3
* G=Throne Room
* H=Sanctum
* I=Stairwell 4
* J=Closet
* K=Study

# rooms

## Stairwell

```
....
.S..
....
```

* S=Simon
* exits=Library | Hallway

## Library
* exits=Stairwell | Stairwell 2

## Hallway
* exits=Stairwell 2

## Stairwell 2

## Foyer
* exits=Stairwell 2 | Stairwell 3

## Stairwell 3

## Throne Room
* exits=Stairwell 3 | Stairwell 4

## Sanctum
* exits=Stairwell 4

## Stairwell 4

## Closet
* exits=Stairwell 4

## Study
* exits=Stairwell 4


# characters

## Simon

* description=A filthy and emaciated man, wearing tattered rags and a very long beard.
* faceImage=/sprites/advisorFace.png

# items

# itinerary

0:00:00 Simon thinks, "Stairs are my favorite."
: Simon @ hallway
: Simon @ study
: Simon @ closet
: Simon @ library

# solutions