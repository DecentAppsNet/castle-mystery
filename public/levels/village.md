# general

* title=Village
* activeCharacter=Simon
* time=0:00

# map

```
....EEFH...
..BCEEFGGJJ
.ABCEEFIIJJ
```

* A=Cottage
* B=Muddy Road
* C=Guard House
* E=Drawbridge
* F=Stairwell
* G=Throne Room
* H=Sanctum
* I=Great Hall
* J=Stables

# rooms

## Cottage

```
....
.S..
....
```

* S=Simon
* exits=Muddy Road

## Muddy Road

* outside=true
* exits=Guard House

## Guard House

* exits=Drawbridge

## Drawbridge

* outside=true
* exits=Stairwell

## Stairwell

* exits=Sanctum | Throne Room | Great Hall

## Throne Room

## Sanctum

## Great Hall

## Stables

*exits=Throne Room
*outside=true

# characters

## Simon

* description=A filthy and emaciated man, wearing tattered rags and a very long beard.
* faceImage=/sprites/advisorFace.png

# items

# itinerary

: Simon @ Sanctum
: Simon @ Great Hall
: Simon @ Stables

# solutions