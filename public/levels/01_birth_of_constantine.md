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

* P=Pope
* U=Ugolino
* n=Side Table|Letter
* c=Coffer
* exits=West Square

## West Square

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
* title=
* outside=true
* exits=Birthing Tent

## Birthing Tent

```
....C.p.
..M.....
........
```

* p=Pile of Presents
* C=Constance I
* M=Sofia the Midwife
* outside=true
* exits=East Square

## East Square

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
9:00:07 @ East Square.10%

9:00:00 Pope takes Holy Binky in right hand
: says "Behold the Holy Binky!"
: faces left.
: says "Carved by Joseph. Given to the baby Jesus."
: Ugolino says "A fitting gift for the new mother."

9:00:19 Ugolino @ Cathedral.30%
: faces right.

9:00:20 Pope @ Birthing Tent.20%
: Sofia the Midwife says, "My lady, his Holiness has arrived."
: Constance I says, "I know! He reeks of frankincense."
: Pope says, "Oh, beloved daughter, Queen of Sicily."
: Constance I says, "(huff) (huff)"
: Pope says, "I bestow to your newborn a gift most-"
: Constance I says, "Just leave it on the pile."
: Pope says, "But-"
: Constance I says, "Thank you! You can go."
: Pope @ Birthing Tent.80%
: drops Holy Binky
: Constance I says, "(huff) (huff)"

9:00:43 Amos @ Birthing Tent.90%
: Amos says, "Your Majesty, shall I bring them in?"
: Constance I says, "Yes! As many as possible."
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
: thinks, "Best to keep it here."
: @ East Square.10%

9:00:57 Sticky Agatha @ Birthing Tent.90%
: Constance I says, "Aiieeee!"
: Sofia the Midwife @ Birthing Tent.70%
: faces left.
: Constance I gives newborn baby to Sofia the Midwife.
: Sofia the Midwife takes newborn baby in left hand.
: Constance I says, "Did you see?"
: Sticky Agatha says, "Your Majesty?"
: Constance I says, "Did you see the birth!"
: Sticky Agatha says, "Yes!"
: Constance I says, "Oh, you have a little one too!"
: Sticky Agatha says, "Yes, your Majesty."
: Constance I says, "See that pile of gifts?"
: Constance I says, "Grab one of them for your baby."
: Sticky Agatha takes Holy Binky.
: says, "I am overwhelmed by your grace."
: Constance I says, "Just tell everybody I wasn't faking."
(Agatha leaves)
: Sofia the Midwife says, "Majesty, what shall you name him?"
: Constance I says, "Constantine. After myself, of course."

9:00:48 Pope @ Cathedral
: Ugolino says, "Your Holiness has returned."
: Pope says, "That is apparent. Why say it?"
: Ugolino says, "I... uh... "
: says "...wanted to acknowledge your presence respectfully."
: Pope says, "A simple bow suffices, Archbishop."
9:01:02 faces right.
: says, "What a drab little church."
: says, "Not a single flying buttress!"
: Ugolino says, "I shall tell the parish priest of your dissatisfaction."
: Pope says, "Good."

9:00:00 Constance I says "Aiiieeee!"
: says "(huff) (huff) (huff)"
: Sofia the Midwife says "My lady, let me send these common folk away."
: Constance I says "No! They must all see!"
: Sofia the Midwife says "As you wish."
9:00:15 Constance I says "(huff) (huff)"

9:00:21 Old Female Peasant 2 thinks, "The Queen is much too old for this."

9:01:25 Sticky Agatha @ Living Space

9:01:28 Amos says, "Next!"
: says, "Get in there and witness."

9:00:57 Male Peasant 4 thinks, "She brings a baby into the tent?"
: Old Female Peasant 2 thinks, "What fraud is this? We are not blind."

9:00:18 Female Peasant thinks, "40 years? She's too old to have a child!"

# Conclusions

## Identities
* unlockConclusions=The Relic

## The Relic
* conclusion=The [Holy Binky] was regifted to [Sticky Agatha].