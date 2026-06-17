# General

* title=The Black Brick
* activeCharacter=Steward
* time=11:57:00
* background=daySky.png
* imports=items.md | characters.md
* groundFloorRoom=Lawn

# Map

```
....CCDE..HHH.
AABBCCDFGGHHH.
...QIIDJJMKKL.
...QOOOPPMN...
```

* A=Lawn West
* B=Lawn
* C=Lawn East
* D=Central Stairwell
* E=Guard Chamber
* F=Portcullis Chamber
* G=Courtyard
* H=Courtyard East
* I=West Hall
* J=East Hall
* K=Wine Cellar
* L=Textile Store
* M=East Stairwell
* N=Grain Store
* P=Steward's Office
* O=Lower Passage
* Q=West Stairwell

# Rooms

## Lawn West

* title=
* outside=true
* exits=Lawn

```
........
.F.P....
........
```

* P=Pope
* F=King Frederick

## Lawn

* outside=true
* exits=Lawn East

## Lawn East

* title=
* outside=true
* exits=Central Stairwell (closed)

## Central Stairwell

* title=

## Guard Chamber

* exits=Central Stairwell (closed)

## Portcullis Chamber

* exits=Central Stairwell (closed) | Courtyard (closed)

## Courtyard

* outside=true
* exits=Courtyard East

## Courtyard East

* title=
* outside=true

## West Hall

* exits=Central Stairwell (closed) | West Stairwell (closed)

## East Hall

* exits=Central Stairwell (closed) | East Stairwell (closed)

## Wine Cellar

* exits=East Stairwell (closed) | Textile Store (locked, unlockable with Steward's Key)

## Textile Store

## East Stairwell

* exits=Grain Store (locked, unlockable with Steward's Key) | Steward's Office (unlockable with Steward's Key)

## Grain Store

* exits=East Stairwell (locked)

## Steward's Office

* exits=East Stairwell (locked, unlockable with Steward's Key) | Lower Passage (locked, unlockable with Steward's Key)

```
........
..S.....
........
```

* S=Steward

## Lower Passage

* exits=Steward's Office (unlockable with Steward's Key)

## West Stairwell

# Characters

## Steward

* description=What does he do? Nobody really cares. And he likes it that way.
* items=Steward's Key

# Items

## Steward's Key

* description=An ordinary key. It probably unlocks some things.

# Itinerary

(11:57 Pope and Frederick are at West Lawn)
12:00:00 King Frederick @ Courtyard East.30%
12:00:00 Pope @ Courtyard East.10%

(11:57 Steward is in his office)
11:57:30 Steward @ West Stairwell
: @ Textile Store
: @ Grain Store
: @ Lower Passage

# Conclusions
