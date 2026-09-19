# General

* title=Adhoc
* activeCharacter=Sticky Agatha
* time=9:00
* background=countryside.png
* imports=items.md | characters.md | roomStyles.md

# Map

```
..........
AABB..DDF.
AABBCCDDE.
```

* A=Cathedral
* B=West Square
* C=Birthing Tent
* D=East Square
* E=Guard Quarters
* F=Living Space

# Rooms

## Cathedral

* style=Old Castle
* exits=West Square

```
.n.c....
....U.P.
........
```

* P=Pope
* U=Ugolino
* n=Side Table|Letter
* c=Coffer

## West Square

* title=
* outside=true
* exits=Birthing Tent
* style=Town Street Day

```
..NMFGHI
........
........
```

* M=male peasant
* F=female peasant
* N=male peasant 3
* G=female peasant 3
* H=old male peasant
* I=old female peasant

## Birthing Tent

* outside=true
* exits=East Square
* style=Town Street Day

```
....C.p.
..M.....
........
```

* p=Pile of Presents
* C=Constance I
* M=Sofia the Midwife

## East Square

* outside=true
* style=Town Street Day
* title=
* exits=Guard Quarters|Living Space


```
v.F..GH.
A.......
...MNI..
```

* A=Amos
* v=Vase
* M=male peasant 2
* F=female peasant 2
* N=male peasant 4
* G=female peasant 4
* H=old male peasant 2
* I=old female peasant 2

## Guard Quarters

* style=Old Castle

## Living Space

* style=Old Castle

```
.I..
.A..
....
```

* A=Sticky Agatha
* I=infant

# Characters

## Constance I
* orientation=laying
* items=newborn baby

## Pope

* items=Holy Binky

## Male Peasant 2
* facing=left

## Female Peasant 2
* facing=left

## Male Peasant 4
* facing=left

## Female Peasant 4
* facing=left

## Old Male Peasant 2
* facing=left

## Old Female Peasant 2
* facing=left

## Sticky Agatha

# Items

## Pile of Presents
* image=presents.png

## Vase

* description=A vase of water with "Amos" written on it.
* image=amosVase.png

## Holy Binky

## Infant

* description=A swaddled-up infant, peering calmly at the World around him.
* image=swaddledBaby.png

## Newborn Baby

* description=A swaddled-up infant, peering irritatedly at the World around him.
* image=newborn.png

## Coffer

* description=Contains a note, "And now we are promised an heir for both Sicily and Germany? An Emperor of this kind would be uncontrollable!"
## Side Table

## Letter

* description="His Holiness and Archbishop Ugolino di Conti shall arrive at your humble parish on Tuesday. Provide the most lavish accomodations you may manage. May God forgive your shortcomings as a host."

# Itinerary

9:00:00 Sticky Agatha says "Today, we may see our Queen."
: takes infant in right hand.
9:00:07 @ East Square (10%)

9:00:00 Pope takes Holy Binky in right hand
: says "Behold the Holy Binky!"
: faces left.
: says "Carved by Joseph. Given to the baby Jesus."
: Ugolino says "A fitting gift for the new mother."

9:00:19 Ugolino @ Cathedral (30%)
: faces right.


# Conclusions

## Identities
* unlockConclusions=The Relic

## The Relic
* conclusion=The [Holy Binky] was regifted to [Sticky Agatha].