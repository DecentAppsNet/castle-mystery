# general

* activeCharacter=Niccolo
* time=0:00

# map

```
ABC
```

* A=Forest
* B=Hall
* C=Crypt

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
* exits=Forest | Crypt

```
....
....
....
```

## Crypt

* obscured=true
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

0:00:01 becomes Niccolo Masked
0:00:03 Niccolo Masked @ Hall
0:00:04 becomes Niccolo
0:00:06 Niccolo @ Crypt