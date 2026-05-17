# general

* title=Murder on the Orient Express
* activeCharacter=Conductor
* time=0:00
* winSynopsis=Murder on the Orient Express

# map

```
CS
--
```

* C=Conductor's Seat
* S=Samuel Ratchet Room
* -=Corridor

# rooms

## Conductor's Seat

* exits=Corridor

```
...
.cC
...
```

* c=Conductor's Chair
* C=Conductor

## Samuel Ratchet Room

* exits=Corridor

```
......
.b..cd
..S...
```

* b=Bed
* c=Ratchet's Chair
* d=Desk
* S=Samuel Ratchet

## Corridor

* exits=Conductor's Seat|Samuel Ratchet Room

```
#.............................#
#.............................#
###############################
```

# characters

## Conductor

* description=A tired ruler in a rumpled nightshirt, watching the house with anxious eyes.
* faceImage=/sprites/kingFace.png

## Samuel Ratchet

* description=A playful fellow, eager to please, smiling, yet always terrified.
* faceImage=/sprites/jesterFace.png

# items

## Desk

* description=A sturdy mahogany desk
* displayChar=⚚

## Conductor's Chair

* description=A fancy chair - it looks very comfortable
* displayChar=†

## Ratchet's Chair

* description=A fancy chair - it looks very comfortable
* displayChar=†

## Bed

* title=A sumptuous bed
* description=The most luxurious of beds
* displayChar=⌸


# itinerary

0:00:00 Conductor @ Conductor's Seat
0:00:00 Samuel Ratchet @ Samuel Ratchet Room
0:00:03 Conductor says "(sigh)"
0:00:05 Conductor says "ANNOUNCEMENT: Unfortunately we have hit a snowdrift - let's all have dinner"
0:00:40 Conductor @ Corridor
0:00:40 Samuel Ratchet @ Corridor

# solutions

* actions=searched|lied|left|took

