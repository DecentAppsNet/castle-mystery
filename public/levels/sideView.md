# general

* title=Side View
* activeCharacter=Simon
* time=0:00
* winSynopsis=The first side view level.

# map

```
ABCCGGGH
DBEFGGG
```

* A=Library
* B=Stairwell
* C=Hallway
* D=Guard Room
* E=Foyer
* F=Kitchen
* G=Throne Room
* H=Sanctum

# rooms

## Library

```
....
....
.P..
```

* P=Simon
* exits=Stairwell

## Stairwell

## Hallway

* exits=Stairwell

## Guard Room

```
....
....
.G..
```

* G=Amos
* exits=Stairwell (lockable)

## Foyer

* exits=Stairwell | Kitchen
* obscured=true

## Kitchen

* exits=Throne Room

## Throne Room

* exits=Kitchen | Sanctum | Hallway

## Sanctum

# characters

## Simon

* description=A filthy and emaciated man, wearing tattered rags and a very long beard.
* faceImage=/sprites/advisorFace.png

## Amos

* description=A man reluctantly willing to beat people up. He'd rather not, but he certainly will.
* faceImage=/sprites/guardFace.png
* items=Red Key|Blue Key|Purple Key

# items

## Red Key

## Blue Key

## Purple Key

# itinerary

0:00:00 Simon says, "Here I am."
: Simon @ Stairwell
: Simon @ Hallway
: Simon @ Sanctum

# solutions