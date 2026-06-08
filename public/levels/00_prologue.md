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
* v=Vase 
* L=Lorenzo
* M=Marty

## Hallway

* exits=Gift Shop

## Gift Shop

```
.2345...
.....L..
........
```

* L=Larry
* 2=Vase 2
* 3=Vase 3
* 4=Vase 4
* 5=Vase 5

# Characters

## Lorenzo

* description=He wears a name badge that says "Guida / Guide - Lorenzo".

## Larry

* description=A seven-year-old boy, ready for trouble.

## Marty

* description=He seems bored and curious at the same time.

# Items

## Sarcophagus

* description=A nearby plaque reads, "Federico II (1194–1250), Imperatore del Sacro Romano Impero e Re di Sicilia. Sepolto nel sarcofago imperiale di porfido della Cattedrale di Palermo."
* image=sarcophagus.png
* drawOffsetX=1

## Sarcophagus Lid
* image=sarcophagusLid.png
* drawOffsetX=4.5
* drawOffsetY=.3

## Vase

* description=A nearby plaque reads, "Questo vaso di terracotta, realizzato nel XII secolo, apparteneva probabilmente a un romano della classe lavoratrice."
* image=amosVase.png

## Vase 2
* description=A vase made of clay with lettering on the side.
* image=amosVase.png

## Vase 3
* description=A vase made of clay with lettering on the side.
* image=amosVase.png

## Vase 4
* description=A vase made of clay with lettering on the side.
* image=amosVase.png

## Vase 5
* description=A vase made of clay with lettering on the side.
* image=amosVase.png

# itinerary

11:00:00 Marty faces left.
: says, "Aren't you going to give a tour?"
: Lorenzo says, "I need more people here before I can start."
: Marty says, "Why?"
: Lorenzo says, "It's weird to give a tour to just one person."
: Marty says, "LARRY!"
: Lorenzo says, "Okay, I guess two people is enough for a tour."
: says, "Here you stand before the final tomb of Emperor Frederick II of the Holy Roman-"
: Marty says, "Is he in that box right now?"
: Lorenzo says, "Yes, his remains are actually inside the sarcoph-"
: Marty says, "Can we see?"
: Lorenzo says, "No! Let me give the tour."
: says "Here you stand before the final tomb of-"