# General

* title=Birth of Constantine
* activeCharacter=Constance I
* time=9:00
* background=countryside.png
* imports=items.md | characters.md

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

```
.n.c....
....U.P.
........
```

* P=Pope Innocent III
* U=Ugolino di Conti
* n=Side Table|Letter
* c=Coffer
* exits=West Square

## West Square

* title=
* outside=true
* exits=Birthing Tent

## Birthing Tent

```
....C...
..M.....
........
```

* C=Constance I
* M=Midwife
* outside=true
* exits=East Square

## East Square

```
v.......
A.......
........
```

* A=Amos
* v=Vase
* title=
* outside=true
* exits=Guard Quarters|Living Space

## Guard Quarters

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

## Vase

* description=A vase of water with "Amos" written on it.

## Holy Binky

* description=A device roughly carved from wood.

## Infant

* description=A swaddled-up infant, peering calmly at the World around him.

## Newborn Baby

* description=A swaddled-up infant, peering irritatedly at the World around him.

## Coffer

* description=Contains a note, "And now we are promised an heir for both Sicily and Germany? An Emperor of this kind would be uncontrollable!"
## Side Table

## Letter

* description="His Holiness and Archbishop Ugolino di Conti shall arrive at your humble parish on Tuesday. Provide the most lavish accomodations you may manage. May God forgive your shortcomings as a host."

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

9:00:19 Ugolino di Conti @ Cathedral.30%
: faces right.

9:00:20 Pope Innocent III @ Birthing Tent.20%
: Midwife says, "My lady, his Holiness has arrived."
: Constance I says, "I know! He reeks of frankincense."
: Pope Innocent III says, "Oh, beloved daughter, Queen of Sicily."
: Constance I says, "(huff) (huff)"
: Pope Innocent III says, "I bestow to your newborn a gift most-"
: Constance I says, "Just leave it on the pile."
: Pope Innocent III says, "But-"
: Constance I says, "Thank you! You can go."
: Pope Innocent III @ Birthing Tent.80%
: drops Holy Binky
: Constance I says, "(huff) (huff)"

9:00:43 Amos @ Birthing Tent.90%
: Amos says, "Your Majesty, shall I bring them in?"
: Constance I says, "Yes, damn it! As many as possible."
: Constance I says, "All must see!"

9:00:52 Amos @ East Square
: faces left.
: says, "You there."
: Sticky Agatha faces right.
: says, "Me?"
: Amos says, "Yes. Go inside the tent."
9:00:59 Amos takes vase in right hand.
: @ Guard Quarters
: Amos drops vase.
: @ East Square

9:00:57 Sticky Agatha @ Birthing Tent.90%
: Constance I says, "Aiieeee!"
: Midwife @ Birthing Tent.70%
: faces left.
: Constance I gives newborn baby to Midwife.
: Midwife takes newborn baby in left hand.
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
(Agatha leaves)
: Midwife says, "Majesty, what shall you name him?"
: Constance I says, "Constantine. After myself, of course."

9:00:44 Pope Innocent III @ Cathedral
: Ugolino di Conti says, "Your Holiness has returned."
: Pope Innocent III says, "That is apparent. Why say it?"
: Ugolino di Conti says, "I... uh... "
: says "...wanted to acknowledge your presence respectfully."
: Pope Innocent III says, "A simple bow suffices."
9:00:58 faces right.
: says, "What a drab little church."
: says, "Not a single flying buttress!"
: Ugolino di Conti says, "I shall tell the parish priest of your dissatisfaction."
: Pope Innocent III says, "Yes."

9:00:00 Constance I says "Aiiieeee!"
: says "(huff) (huff) (huff)"
: Midwife says "My lady, let me send these common folk away."
: Constance I says "No! They must all see!"
: Midwife says "As you wish."

9:01:27 Amos says, "Next!"
: says, "Get in there and witness."

9:01:22 Sticky Agatha @ Living Space