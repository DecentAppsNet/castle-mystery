# general

* title=Escape
* activeCharacter=Simon
* time=0:00
* winSynopsis=Simon had but one chance to escape. He couldn't run from Amos in the castle forever. So he hid behind a suit of armor in the foyer, while the guard ran past him. And a moment later, Simon found his way to the guard room, where Amos had sloppily left the key to freedom.

# map

```
......JJL....
..BIIIJJLKKKK
.ABCCGGGHKKKK
NDBEFGGGMKKKK
........MKKKK
```

* A=Library
* B=Stairwell
* C=Hallway
* D=Guard Room
* E=Foyer
* F=Kitchen
* G=Throne Room
* H=Sanctum
* I=Upper Hallway
* J=Chapel
* K=Auditorium
* L=Aerie
* M=Lower Stairwell
* N=Outer Hall

# rooms

## Lower Stairwell

* exits=Auditorium | Throne Room

## Auditorium

* exits=Sanctum

## Aerie

* exits=Auditorium

## Library

```
....
.P..
....
```

* P=Simon
* exits=Stairwell

## Upper Hallway

* exits=Stairwell

## Chapel

* exits=Upper Hallway

## Stairwell

## Hallway

* exits=Stairwell

## Guard Room

```
....
.G..
p...
```

* G=Amos
* p=Purple Key
* exits=Stairwell (lockable)|Outer Hall (locked, unlockable with Purple Key)

## Outer Hall

* obscured=true

## Foyer

```
....
....
.s..
```

* s=Suit of Armor
* exits=Stairwell | Kitchen
* obscured=true


## Kitchen

* exits=Throne Room

## Throne Room

* exits=Kitchen | Sanctum | Hallway

## Sanctum

* obscured=true

# characters

## Simon

* description=A filthy and emaciated man, wearing tattered rags and a very long beard.
* faceImage=advisorFace.png

## Amos

* description=A man reluctantly willing to beat people up. He'd rather not, but he certainly will.
* faceImage=guardFace.png
* items=Red Key|Blue Key

# items

## Red Key

## Blue Key

## Purple Key

* description=A brass key diligently painted purple to distinguish it from others.

## Suit of Armor

* description=A suit of armor with room behind it to hide something the exact same shape as it.

# itinerary

0:00:00 Simon thinks, "I must escape!"
: Simon @ Stairwell
: Simon thinks, "no, not this way."
: Simon @ Hallway
: Simon @ Sanctum
: Simon @ Auditorium
: Simon @ Lower Stairwell
: Simon @ Foyer
0:00:45 Simon @ Kitchen
0:01:00 Simon @ Guard Room
: Simon takes Purple Key
: Simon unlocks Outer Hall
: Simon thinks, "Freedom awaits."

0:00:00 Amos thinks, "Where is that filthy prisoner?"
: Amos thinks, "Best I search for him."
: Amos @ Throne Room
: Amos says, "Hey! Stop running!"
: Amos @ Sanctum
: Amos @ Auditorium
: Amos @ Aerie
: Amos thinks, "Of course, he went the other way."
: Amos @ Lower Stairwell
: Amos @ Kitchen
: Amos @ Stairwell
: Amos thinks, "Only one other place he could be."
: Amos @ Chapel
: Amos thinks, "Oh, Amos, you big fool."


# conclusions

* actions=hid | stole | evaded | wanted | spotted

## The Escape Route

* conclusion=[Simon] [wanted] to escape.---[Amos] first [spotted] [Simon] in the [throne room], calling out to him.---With [Amos] in pursuit, [Simon] [hid] in the [foyer].---After [Amos] passed through, [Simon] doubled back, escaping via the [Guard Room].