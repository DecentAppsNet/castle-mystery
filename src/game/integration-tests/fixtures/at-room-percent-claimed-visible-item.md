# general

* activeCharacter=Scout
* time=0:00

# map

```
SRT
```

* S=Source
* R=Target
* T=Tail

# rooms

## Source

* exits=Target

```
S...
....
....
```

* S=Scout

## Target

* exits=Source|Tail

```
....
...B
....
```

* B=Blocker

## Tail

* exits=Target

```
....
....
....
```

# characters

## Scout

# items

## Blocker

* title=Blocker
* description=A visible blocker.
* visible=true

# itinerary

0:00:10 Scout @ Target.90%
