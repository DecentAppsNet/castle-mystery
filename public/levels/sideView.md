# general

* title=Side View
* activeCharacter=Simon
* time=0:00
* winSynopsis=The first side view level.

# map

```
ABCC
DBEF
```

* A=Library
* B=Stairwell
* C=Hallway
* D=Guard Room
* E=Foyer
* F=Kitchen

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
: Simon @ Kitchen

# solutions