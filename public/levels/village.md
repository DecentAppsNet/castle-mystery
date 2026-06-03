# general

* title=Village
* activeCharacter=Simon
* time=0:00
* endTime=00:00:45
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
..B.
S...
....
```

* S=Simon
* B=Table|Box|Capybara
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

```
...Q....
........
........
```

* Q=Queen

## Sanctum

## Great Hall
* obscured=true

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

## Queen

* description=She's seen better days.
* faceImage=queenFace.png
* alive=false
* orientation=laying
* facing=right

# items

## Table
* description = A solid table with barely a wobble.

## Box
* description = This box is empty.

## Capybara
* description = This critter is as friendly as she is smelly.

# itinerary

: Simon takes Capybara in right hand
: Simon @ Sanctum
: Simon drops Capybara
: Simon @ Cottage
: Simon takes Box in left hand
: Simon lays
0:00:25 Simon @ Sanctum
: Simon drops Box
: Simon @ Great Hall
: Simon @ East Hall
: Simon sits

# solutions
* seconds=1|2|3|4|5|6|7|8|9

## Identities
* unlockSolutions=Travel Time

## Travel Time
* solution=It took [6] seconds for Simon to arrive in the sanctum.
* revealRooms=Great Hall