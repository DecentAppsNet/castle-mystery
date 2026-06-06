# General

* title=Birth of Constantine
* activeCharacter=Amos
* time=9:00
* background=countryside.png
* imports=items.md | characters.md

# Map

```
.........
.ABB DDF.
.ABBCDDE.
```

* A=Cathedral
* B=West Square
* C=Birthing Tent
* D=East Square
* E=Market Stall
* F=Living Space

# Rooms

## Cathedral

```
....
U.P.
....
```

* P=Pope Innocent III
* U=Ugolino di Conti
* exits=West Square

## West Square

* title=
* outside=true
* exits=Birthing Tent

## Birthing Tent

```
..C.
M...
....
```

* C=Constance I
* M=Midwife
* outside=true
* exits=East Square

## East Square

```
........
A.......
........
```

* A=Amos
* title=
* outside=true
* exits=Market Stall|Living Space

## Market Stall

## Living Space

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

## Pope Innocent III

* items=Holy Binky

## Sticky Agatha

# Items

## Holy Binky

* description=A device roughly carved from wood.

## Infant

* description=A swaddled-up infant, peering calmly at the World around him.

## Newborn Baby

* description=A swaddled-up infant, peering irritatedly at the World around him.

# Itinerary

9:00:00 Sticky Agatha says "Today, we may see our Queen."
: takes infant in right hand.
: says "May God smile upon us."
9:00:07 @ East Square.10%

9:00:00 Pope Innocent III takes Holy Binky in right hand
: says "Behold the Holy Binky!"
: faces left.
: says "Carved by Joseph. Given to the baby Jesus."
: Ugolino di Conti says "No gift could be more precious."

9:00:20 Pope Innocent III @ Birthing Tent.90%
: faces left
: Midwife says, "My lady, his Holiness has arrived."
: Constance I says, "I know! He reeks of perfume."
: Pope Innocent III says, "Oh, beloved daughter, Queen of Sicily."
: Constance I says, "(huff) (huff)"
: Pope Innocent III says, "I bestow to your newborn a gift most-"
: Constance I says, "Just leave it on the pile."
: Pope Innocent III says, "But-"
: Constance I says, "Thank you! You can go."
: Pope Innocent III drops Holy Binky
: Constance I says, "(huff) (huff)"

9:00:43 Amos @ Birthing Tent.90%
: Amos says, "Your Majesty, shall I bring them in?"
: Constance I says, "Yes, damn it! As many as possible."
: Constance I says, "All must see!"

9:00:52 Amos @ East Square
: faces left.
: says, "You there."
: Sticky Agatha says, "Me?"
: Amos says, "Yes. Go inside the tent."

: Sticky Agatha @ Birthing Tent.90%
: Constance I says, "Aiieeee!"
: Midwife @ Birthing Tent.70%
: faces left.
: Constance I gives Midwife newborn baby.
: Constance I says, "Did you see?"
: Sticky Agatha says, "Your Majesty?"
: Constance I says, "Did you see the birth!"
: Sticky Agatha says, "Yes!"
: Constance I says, "Oh, you have a little one too!"
: Sticky Agatha says, "Yes, your Majesty."
: Constance I says, "See that pile of gifts?"
: Constance I says, "Grab one of them for your baby."
: Sticky Agatha takes Holy Binky.
: says, "I am overwhelmed by your Grace."
: Constance I says, "Just tell everybody I wasn't faking."
: Sticky Agatha @ Living Quarters

9:00:42 Pope Innocent III @ Cathedral
: Ugolino di Conti says, "Your Holiness has returned."
: Pope Innocent III says, "That is apparent. Why say it?"
: Ugolino di Conti says, "I... uh... "
: says "...wanted to acknowledge your presence respectfully."
: Pope Innocent III says, "A simple bow suffices."

9:00:00 Constance I says "Aiiieeee!"
: says "(huff) (huff) (huff)"
: Midwife says "My lady, let me send these common folk away."
: Constance I says "No! They must all see!"
: Midwife says "As you wish."
