# general

* activeCharacter=Niccolo
* time=0:00

# map

```
NH
```

* N=Nave
* H=Hall

# rooms

## Nave

* exits=Hall

```
....
....
....
```

## Hall

* obscured=true
* exits=Nave

```
..N.
....
....
```

* N=Niccolo

# characters

## Niccolo

* title=Niccolo
* isTitleKnown=true

## Niccolo Masked

* title=Niccolo Masked
* isTitleKnown=true

# itinerary

## Niccolo

0:00:03 Niccolo @ Hall
0:00:04 becomes Niccolo Masked
0:00:08 Niccolo Masked @ Nave

# conclusions

## Costumes

* revealRooms=Hall
* conclusion=The costume is revealed.

## Finale

* conclusion=Everything is solved.