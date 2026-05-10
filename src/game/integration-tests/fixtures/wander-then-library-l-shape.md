# general

* activeCharacter=Queen
* time=0:00

# map

```
SSS
W..
W..
WFL
```

* S=Sanctum
* W=West Hall
* F=Foyer
* L=Library

# rooms

## Sanctum

* exits=West Hall

## West Hall

* exits=Sanctum|Foyer

```
............
.....Q......
..#......#..
............
............
..#......#..
............
............
..#......#..
............
............
..#......#..
............
............
............
............
............
```

* Q=Queen

## Foyer

* exits=West Hall|Library

## Library

* exits=Foyer

# characters

## Queen

* description=Test queen.

# itinerary

0:00:01 Queen wanders
0:00:30 Queen @ Library
