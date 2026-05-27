# general

* title=Doors
* activeCharacter=Simon
* time=0:00
* winSynopsis=Doors are nice.

# map

```
AH.
BHT
CHGP
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

* exits=First Cell (locked, lockable) | Second Cell (locked, lockable) | Third Cell (locked, lockable) | Guard Room (locked, lockable) | Torture Chamber

## Guard Room

```
...
.G.
...
```

* G=Amos
* exits=Hallway (lockable)

## Torture Chamber

## Prison Entry

* exits=Guard Room (locked, lockable)
* obscured=true

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
0:00:04 Amos @ First Cell
: Amos says, "Simon, my long-bearded, foul-smelling friend."
: Simon says, "Yes?"
: Amos says, "You get to go outside today."
: Simon says, "That sounds nice."
: Amos says, "Follow me."
0:00:12 Amos @ Torture Chamber
0:00:12 Simon @ Hallway
: Amos says, "Oh, Simon! Come along now."
: Simon says, "I think... I can go back in my cell."
: Amos says, "No, no. That's not how it works."
: Simon says, "Really, my cell is just fine."

# solutions