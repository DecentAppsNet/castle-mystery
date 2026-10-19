# General

* title=Adhoc
* activeCharacter=Marty
* time=11:00:00
* background=daySky.png
* imports=items.md | characters.md | roomStyles.md
* winSynopsis=Storywise, nothing important happened in this level - it was just a tutorial to get you warmed up. We'll let you figure out the rest of the game on your own. The real story begins next!

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

* style=Museum
* exits=hallway

```
..t..s...v..
..M....L....
............
```

* s=Sarcophagus | Sarcophagus Lid
* t=Time of Day Plaque
* v=Pedestal | Vase 
* L=Lorenzo
* M=Marty

## Hallway

* style=Museum

```
........
....L...
........
```

* L=Larry
* exits=Gift Shop

## Gift Shop

* style=Museum

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
* drawOffsetX=0
* drawOffsetY=.3

## Time of Day Plaque
* drawOffsetY=-1

## Vase

* description=An ancient clay vase with faded symbols on it.
* image=amosVase.png
* drawOffsetX=.5

## Shelf 1
* image=giftShopShelf1.png

## Shelf 2
* image=giftShopShelf2.png

## Shelf 3
* image=giftShopShelf3.png
* stackOffsetX=.8
* stackOffsetY=-.8

# itinerary

11:00:00 Marty waits
: says, "Sometimes, I'm a little [tense]tense[/]."
: says, "Other times, I like to be [sneaky]sneaky[/]."
: says, "I'm not *always* a pain."
: says, "[whisper]Do you want to hear a secret?[/]"
: says, "[yell]Too bad![/] I don't trust you."
: says, "My favorite ice cream is [flourish]neopolitan[/]."
: says, "Some people they call me a [manic]space cowboy[/]."

# Conclusions

* verbs=stole|hid|broke|smashed|painted|crushed|dropped
* withObjects=a hammer|his fist|a brush|other vases|his foot|difficulty|his uncle

## Identities

* unlockConclusions=What Happened to the Vase?

## What Happened to the Vase?

* conclusion=[Larry] took the vase to the [Gift Shop] and [hid] it with [other vases].