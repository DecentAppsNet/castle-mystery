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

* exits=Stairwell

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
....
....
```

* t=Table

## Stairwell

# characters
## Sam
* faceImage=guard1.png
* description=It's just a guy.
* bodyOrientation=sitting

# items

## Vase

## Table

# itinerary

0:00:00 Sam @ Hall
: waits .1
: Sam takes Vase in right hand
0:00:06 Sam @ Closet (60%)
: kneels
: waits
: drops Vase on Table
: @ (90%)

# conclusions
