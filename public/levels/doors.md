# general

* title=Doors
* activeCharacter=Simon
* time=0:00
* winSynopsis=Doors are nice.

# map

```
.ABC
.HHH
PGT.
```

* A=First Cell
* B=Second Cell
* C=Third Cell
* H=Hallway
* G=Guard Room
* T=Torture Chamber
* P=Prison Entry

# rooms

## First Cell

```
.P.
...
...
```

* P=Simon
* exits=Hallway

## Second Cell

* exits=Hallway

## Third Cell

* exits=Hallway

## Hallway

```
.........
.........
...X....C
```

* C=corner
* X=center
* exits=First Cell (locked, lockable) | Second Cell (locked, lockable) | Third Cell (locked, lockable) | Guard Room (locked, lockable) | Torture Chamber

## Guard Room

```
...
.G.
...
```

* G=Amos
* exits=Hallway (lockable)

## Prison Entry

* exits=Guard Room (locked, lockable)
* obscured=true

## Torture Chamber

# characters

## Simon

* description=A filthy and emaciated man, wearing tattered rags and a very long beard.
* faceImage=/sprites/advisorFace.png

## Amos

* description=A man reluctantly willing to beat people up. He'd rather not, but he certainly will.
* faceImage=/sprites/guardFace.png

# items

# itinerary

0:00:00 Simon @ First Cell
0:00:00 Amos @ Guard Room
0:00:03 Amos @ First Cell
: Amos says, "Simon, my foul-smelling friend!"
: Simon says, "Yes?"
: Amos says, "You get to go outside your cell today."
: Simon says, "That sounds nice."
: Amos says, "Follow me."
0:00:14 Amos @ Torture Chamber
0:00:14 Simon @ Hallway
: Amos says, "Come along now."
: Simon says, "I think... I should go back."
: Amos says, "No, no. That's not how it works."
0:00:23 Simon @ Hallway.corner
: Simon says, "I don't want to go in there."
0:00:26 Amos @ Hallway.center
: Amos says, "If you don't go in the torture chamber..."
: Amos says, "I will inflict great pain upon you."
: Simon says, "And if I go in the torture chamber?"
: Amos says, "I will inflict great pain upon you."
: Amos says, "Do what I say, and there is a reward for you."
: Simon says, "What reward?"
: Amos says, "You will get this new cell to stay in."
: Amos unlocks Second Cell
0:00:50 Simon @ Torture Chamber
0:00:51 Amos @ Torture Chamber
: Amos says, "Take this!"
: Simon says, "Aieee!"
: Amos wanders.
: Amos says, "Take that!"
: Simon says, "Ow! Ow!"
: Amos wanders.
: Amos says, "You aren't faking, are you?"
: Simon says, "No, no. It hurts."
: Amos says, "Okay, enjoy your new cell!"
0:01:05 Simon @ Second Cell
0:01:05 Amos @ Hallway
: Amos locks Second Cell
0:01:10 Simon wanders.
: Simon wanders.
: Simon wanders.
: Simon says "It's exactly the same!"

# solutions