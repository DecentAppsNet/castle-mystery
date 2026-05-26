# general

* activeCharacter=King
* time=0:00

# map

```
HL
```

* H=Hall
* L=Library

# rooms

## Hall

* exits=Library

```
....
.K..
....
```

* K=King

## Library

* exits=Hall

```
...Y.
.....
..Q.B
```

* Q=Queen
* B=Book
* Y=NE

# characters

## King

* description=A ruler trying to remember details.

## Queen

* description=A patient observer.

# items

## Book

* title=Book
* description=A misplaced novel.
* displayChar=B

# itinerary

   0:00:00    King    @   Hall   
0:00:00 Queen @ Library
0:00:05   Queen   takes   Book.   
  0:00:06   King   @   Library.NE.   
0:00:07   King   says,   "Hello, dear."   
