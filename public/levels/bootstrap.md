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
* obscured=true

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

# itinerary

0:00:00 Sam @ Hall
: @ Stairwell
: appears as guard2
: @ Closet

# conclusions
