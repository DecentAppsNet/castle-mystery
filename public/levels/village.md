# general

* title=Village
* activeCharacter=Simon
* time=0:00

# map

```
....EEFH...
..BCEEFGG..
.ABCEEFII..
```

* A=Cottage
* B=Muddy Road
* C=Guard House
* E=Drawbridge
* F=Stairwell
* G=Throne Room
* H=Sanctum
* I=Great Hall

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

# characters

## Simon

* description=A filthy and emaciated man, wearing tattered rags and a very long beard.
* faceImage=/sprites/advisorFace.png

# items

# itinerary

: Simon @ Sanctum
: Simon @ Throne Room
: Simon @ Great Hall

# solutions