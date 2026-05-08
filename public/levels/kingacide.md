# general

* activeCharacter=King
* time=0:00

# map

```
SSS
WTE
WTE
WFL
```

* S=Sanctum
* T=Throne Room
* W=West Hall
* E=East Hall
* F=Foyer
* L=Library

# rooms

## Sanctum

* exits=West Hall

## West Hall

* exits=Sanctum|Foyer

```
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
..#......#..
............
.....Q......
............
............
............
```

* Q=Queen

## Throne Room

```
.......
.#...#.
...K...
.......
.......
.......
.......
.......
.......
.......
.......
```

* exits=Foyer|East Hall
* K=King

## East Hall

* exits=Throne Room|Library

## Foyer

* exits=West Hall|Throne Room|Library

## Library

```
.....
..B..
.....
```

* B=Romance Novel

* exits=Foyer|East Hall

# characters

## King

* description=A tired ruler in a rumpled nightshirt, watching the house with anxious eyes.
* items=Sceptre | Dagger

## Queen

* description=A poised noblewoman whose careful posture hides a restless tension.

# items

## Sceptre

* description=A finely-crafted token of power, grimy, and scratched.
* displayChar=⚚

## Dagger

* description=An obligatory attempt at self-defense.
* displayChar=†

## Romance Novel

* title=Book
* description=A novel about shipwrecked lovers stranded on an island.
* displayChar=⌸