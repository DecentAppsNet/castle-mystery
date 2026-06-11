# General

* title=House of Rocks
* activeCharacter=Pietro
* time=7:30
* background=countryside.png
* imports=items.md | characters.md

# Map

```
SSWW/AA\......
SSFF/KK\YYYYC.
SSMM/HH\YYYYTT
```

* S=Street
* M=Master's Hall
* K=Common Kitchen
* F=Family Quarters
* A=Apprentices' Chamber
* W=Workers' Dormitory
* /=Stairwell
* \=Stairwell 2
* C=Accounts Room
* Y=Workshop Yard
* T=Stone Store
* H=Tool Store

# Rooms

## Street

* outside=true
* exits=Master's Hall (unlocked, lockable)

## Master's Hall

```
........
...P....
........
```

* P=Pietro
* exits=Street (lockable) | Stairwell (closed)

## Stairwell

* title=
* exits=Workers' Dormitory (unlocked, lockable)

## Family Quarters

* exits=Stairwell (lockable, locked)

## Apprentices' Chamber

```
........
....H...
........
```

* H=Heinrich
* exits=Stairwell (closed) | Stairwell 2 (closed)

## Workers' Dormitory

* exits=Stairwell (unlocked, lockable)

## Common Kitchen

```
........
...M.A..
........
```

* M=Maria
* A=Anna
* exits=Stairwell | Stairwell 2

## Stairwell 2

* title=
* exits=Tool Store (locked, lockable) | Workshop Yard

## Tool Store

## Stone Store

## Workshop Yard

```
................
.M.I.Y.G.A..N.S.
................
```

* A=Andreas
* G=Giovanni
* M=Ahmad
* N=Niccolo
* I=Giorgios
* Y=Yusuf
* S=Stefan
* exits=Stone Store (unlocked, lockable) | Accounts Room (unlocked, lockable)
* outside=true

## Accounts Room

```
....
..S.
....
```

* S=Salomone

# Characters

## Pietro

* items=owner's key

# Items

## Owner's Key

# Itinerary

7:30:00 Pietro @ Master's Hall
: @ Street
: @ Workers' Dormitory
: @ Apprentices' Chamber
: @ Common Kitchen
: @ Tool Store
: @ Stone Store
: @ Accounts Room
: @ Family Quarters