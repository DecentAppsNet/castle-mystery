# general

* activeCharacter=Hero
* time=0:00

# map

```
HS
```

* H=Hall
* S=Store

# rooms

## Hall

```
....
.H..
....
```

* H=Hero
* exits=Store

## Store

```
....
.B..
....
```

* B=Bob
* exits=Hall
* obscured=true

# characters

## Hero

* description=Listening nearby.

## Bob

* description=Talking in the obscured next room.

# itinerary

0:00:01 Bob says "Hello from the store."