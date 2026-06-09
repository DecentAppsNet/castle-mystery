# General

* title=Prologue
* activeCharacter=Marty
* time=11:00:00
* background=daySky.png
* imports=items.md | characters.md

# Map

```
.......
VVV....
VVVHHGG
```

* V=Exhibit Room
* H=Hallway
* G=Gift Shop

# Rooms

## Exhibit Room

```
.....s...v..
..M....L....
............
```

* s=Sarcophagus | Sarcophagus Lid
* exits=hallway
* v=Pedestal | Vase 
* L=Lorenzo
* M=Marty

## Hallway

```
........
....L...
........
```

* L=Larry
* exits=Gift Shop

## Gift Shop

```
..1.2.3.
........
........
```

* 1=Shelf 1
* 2=Shelf 2
* 3=Shelf 3

# Characters

## Lorenzo

* description=He wears a name badge that says "Guida / Guide - Lorenzo".
* facing=left
* faceImage=lorenzo.png

## Larry

* description=A seven-year-old boy, ready for trouble.
* faceImage=larry.png

## Marty

* description=He seems bored and curious at the same time.
* faceImage=marty.png

# Items

## Sarcophagus

* description=A nearby plaque reads, "Federico II (1194–1250), Imperatore del Sacro Romano Impero e Re di Sicilia. Sepolto nel sarcofago imperiale di porfido della Cattedrale di Palermo."
* image=sarcophagus.png
* drawOffsetX=1

## Sarcophagus Lid
* image=sarcophagusLid.png
* drawOffsetX=1
* drawOffsetY=.3

## Vase

* description=An ancient clay vase with faded symbols on it.
* image=amosVase.png

## Shelf 1
* image=giftShopShelf1.png

## Shelf 2
* image=giftShopShelf2.png

## Shelf 3
* image=giftShopShelf3.png

# itinerary

11:00:00 Marty says, "Aren't you going to give a tour?"
: Larry faces left.
: Lorenzo says, "I need more people here before I can start."
: Marty says, "Why?"
: Lorenzo says, "It's weird to give a museum tour to just one person."
: Marty says, "LARRY!"
11:00:16 Larry @ Exhibit Room.90%
: Lorenzo faces right.
: says, "Okay, I guess two people is enough for a tour."
: faces left.
: says, "You stand before the final tomb of"
: says, "Emperor Frederick II, ruler of-"
: Marty says, "Is he in that box right now?"
: Lorenzo says, "Yes."
: Marty says, "Can we see?"
: Lorenzo says, "No! Let me give the tour."
: says "You stand before the final tomb-"
: Larry takes Vase in right hand
: Lorenzo faces right.
: says, "Put that down!"
11:00:45 Larry @ Gift Shop.80%
: drops Vase (.5,-.8,0)
: @ Gift Shop.30%
11:00:46 Lorenzo @ Gift Shop.10%
: says, "Where is it?"
: Larry faces right.
: Lorenzo @ Gift Shop.80%
: @ Gift Shop.70%
: says, "Oh no!"
: @ Gift Shop.80%
: @ Gift Shop.60%
: @ Gift Shop.70%

11:00:48 Marty takes Sarcophagus Lid in left hand
: @ Exhibit Room.30%
: drops Sarcophagus Lid
: @ Exhibit Room.50%
: faces left
: says, "Sick!"

# Solutions

* verbs=stole|hid|broke|smashed|painted|crushed|dropped
* withObjects=a hammer|his fist|a brush|other vases|his foot|difficulty|his uncle

## Identities

* unlockSolutions=What Happened to the Vase?

## What Happened to the Vase?

* solution=[Larry] took the vase to the [Gift Shop] and [hid] it with [other vases].