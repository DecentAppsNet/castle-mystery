# general

* activeCharacter=Niccolo
* time=22:59:30

# map

```
..CCAAA...
DDCCAAABB.
..........
```

* A=Nave
* B=Hall
* C=Entrance
* D=Forest

# rooms

## Entrance

* exits=Nave (unlocked, lockable) | Forest
* outside=true

## Forest

* outside=true

```
........
..AN....
........
```

* A=Sticky Agatha
* N=Niccolo

## Nave

* exits=Hall | Entrance (lockable)

```
............
............
............
```

* N=Niccolo

## Hall

* obscured=true

# characters

## Sticky Agatha

* isTitleKnown=true

## Niccolo

* isTitleKnown=true

## Niccolo Masked

* title=Niccolo Masked

# itinerary

22:59:30 Sticky Agatha says "Put on your mask!" to Niccolo.
: Niccolo says, "Oh, right."
: becomes Niccolo Masked
: Sticky Agatha says, "I'll stay here and keep watch."

23:00:00 Niccolo Masked @ Hall