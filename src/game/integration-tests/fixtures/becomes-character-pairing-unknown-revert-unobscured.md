# general

* activeCharacter=Niccolo
* time=0:00

# map

```
ABC
```

* A=Forest
* B=Hall
* C=Nave

# rooms

## Forest

* outside=true
* exits=Hall

```
....
.N..
....
```

* N=Niccolo

## Hall

* obscured=true
* exits=Forest | Nave

```
....
....
....
```

## Nave

* exits=Hall

```
....
....
....
```

# characters

## Niccolo

* title=Niccolo
* description=The visible source.

## Niccolo Masked

* title=Niccolo Masked
* description=The masked replacement.

# itinerary

## Niccolo

0:00:03 Niccolo @ Hall
0:00:04 becomes Niccolo Masked
0:00:06 Niccolo Masked @ Nave
0:00:07 becomes Niccolo