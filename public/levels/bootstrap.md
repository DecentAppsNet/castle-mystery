# general

* title=Bootstrap
* activeCharacter=Sam

# map

```
CS
HS
```

* H=Hall
* C=Closet
* S=Stairwell

# rooms
## Hall

* exits=Stairwell (locked, lockable)

```
.v..
..S.
....
```

* S=Sam
* v=Vase

## Closet

* exits=Stairwell

```
.t..
..M.
....
```

* t=Table
* M=Maria

## Stairwell

* exits=Hall

# characters
## Sam
* faceImage=guard1.png
* description=It's just a guy.
* bodyOrientation=sitting

### Guard2
* faceImage=guard2.png
* description=Guard2

### Guard3
* faceImage=guard3.png
* description=Guard3

## Maria
* faceImage=maria.png
* description=It's just a gal.

# items

## Vase

* description=An ordinary vase.

## Table

## Super Vase

* description=Fukkin super vase, bro.

# itinerary

0:00:00 Sam @ Hall
: says "Just me."
: appears as guard2
: says "Guard 2"
: appears as guard3
: says "Guard 3"
: appears as default
: says "Just me again."

# conclusions
