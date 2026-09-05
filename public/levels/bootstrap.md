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
: takes vase in right hand
: says "Vase."
: vase becomes Super Vase
: says "Super Vase!"
: drops super vase
: Super Vase becomes Vase
: says "Vase."
: takes vase in left hand
: Vase becomes Super Vase
: says "YEAAAAAH! SUPER VASE!"

# conclusions
