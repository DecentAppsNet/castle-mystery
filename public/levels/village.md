# general

* title=Village
* activeCharacter=Simon
* time=0:00
* background=countryside.png

# map

```
....EEFH......
..BCEEFGGJJLM.
.ABCEEFIIJJKKK
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
* K=East Hall
* L=Roof Deck
* M=Guest Quarters

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

* exits=Throne Room
* outside=true

## East Hall

* exits=Stables

## Roof Deck

* outside=true
* exits=Guest Quarters

## Guest Quarters

# characters

## Simon

* description=A filthy and emaciated man, wearing tattered rags and a very long beard.
* faceImage=advisorFace.png

# items

# itinerary

: Simon @ Sanctum
: Simon @ Great Hall
: Simon @ East Hall

# solutions