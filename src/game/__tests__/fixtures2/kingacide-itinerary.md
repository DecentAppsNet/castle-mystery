# general

* activeCharacter=King
* time=0:00

# map

```
SW...
.WFTE
.WFLE
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
....
.Q..
....
```

* Q=Queen

## Throne Room

```
....
.K..
....
```

* exits=Foyer|East Hall
* K=King

## East Hall

* exits=Throne Room|Library
* obscured=true

## Foyer

* exits=West Hall|Throne Room|Library

## Library

```
....
.B..
....
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

## Dagger

* description=An obligatory attempt at self-defense.

## Romance Novel

* title=Book
* description=A novel about shipwrecked lovers stranded on an island.

# itinerary

0:00:00 King @ Throne Room
0:00:03 King says "It's good to be king."
0:00:10 King says "Where did I put that book?"
0:00:13 King says "Perhaps I left it in the library."
0:00:28 King says "It must be in the library."
0:00:34 King @ Library

0:00:00 Queen @ West Hall
0:00:30 Queen @ Library
0:00:31 Queen says "Hmm."
0:00:32 Queen takes Book

King arrived in the library at 0:00:34.

0:00:35 King says "Hello, dear."
0:00:37 Queen says "Oh. Hi."
0:00:39 King says "Have you seen my favorite book?"
0:00:42 Queen says "No."

0:00:44 Queen @ East Hall