# General

* title=The Black Brick
* activeCharacter=Hugo
* time=11:58:00
* background=daySky.png
* imports=items.md | characters.md
* groundFloorRoom=Lawn

# Map

```
....CCDE..HHH.
AABBCCDFGGHHH.
...QIIDJJMKKL.
...QOOOPPMN...
```

* A=Lawn West
* B=Lawn
* C=Lawn East
* D=Central Stairwell
* E=Guard Chamber
* F=Portcullis Chamber
* G=Courtyard
* H=Courtyard East
* I=West Hall
* J=East Hall
* K=Wine Cellar
* L=Textile Store
* M=East Stairwell
* N=Grain Store
* P=Steward's Office
* O=Lower Passage
* Q=West Stairwell

# Rooms

## Lawn West

* title=
* outside=true
* exits=Lawn

```
........
.F.P....
........
```

* P=Pope
* F=King Frederick

## Lawn

* outside=true
* exits=Lawn East

## Lawn East

* title=
* outside=true
* exits=Central Stairwell (closed)

## Central Stairwell

* title=

## Guard Chamber

* exits=Central Stairwell (closed)

```
....
..H.
....
```

* H=Hugo

## Portcullis Chamber

* exits=Central Stairwell (closed) | Courtyard (closed)

## Courtyard

* outside=true
* exits=Courtyard East

## Courtyard East

* title=
* outside=true

```
............
............
.......c.t..
```

* t=Arabic Tower
* c=Arabic Tower Collapsed

## West Hall

* exits=Central Stairwell (closed) | West Stairwell (closed)

## East Hall

* obscured=true
* exits=Central Stairwell (closed) | East Stairwell (closed)

## Wine Cellar

* exits=East Stairwell (closed) | Textile Store (locked, unlockable with Steward's Key)

## Textile Store

## East Stairwell

* exits=Grain Store (locked, unlockable with Steward's Key) | Steward's Office (unlockable with Steward's Key)

## Grain Store

* exits=East Stairwell (locked)

## Steward's Office

* exits=East Stairwell (locked, unlockable with Steward's Key) | Lower Passage (locked, unlockable with Steward's Key)

```
........
..S.....
........
```

* S=Raniero

## Lower Passage

* exits=Steward's Office (unlockable with Steward's Key)

## West Stairwell

# Characters

## Hugo

* items=Black Brick

## Pope

* facing=left

## Raniero

* items=Steward's Key

# Items

## Arabic Tower

* image=arabicTower.png
* description=Maybe a century old, structurally sound.

## Arabic Tower Collapsed

* image=arabicTowerCollapsed.png
* description=It's seen better days - yesterday, for example.
* visible=false

## Steward's Key

* description=An ordinary key. It probably unlocks some things.

## Black Brick

* image=blackBrick.png
* description=A limestone brick, painted black, inscribed with careful lettering, "Constantine, May 3rd, 1195, Noon".

# Itinerary

(11:58 Pope and Frederick are at West Lawn)
11:58:00 Pope says, "Welcome to the Lateran Palace, my boy."
: King Frederick says, "It is nice here."
: Pope says, "''Nice'', you say?"
: Pope says, "You stand at the very heart of Christendom!"
: King Frederick says, "It's more a collection of buildings than a palace."
: Pope says, "Hrmph."

(11:58 Hugo is in the guard chamber)
11:59:00 Hugo @ East Hall

11:58:20 Pope @ Lawn
11:58:21 King Frederick @ Lawn
: Pope says, "Since your poor mother, Constance, passed,"
: says, "you have been under my protection."
: says, "Many times I have saved you from peril."
: King Frederick faces Pope
: says, "You have?"
: Pope says, "Nearly every week, I thwart some scheme."
: says, "Your enemies plot to dethrone or kill you."
: King Frederick says, "I have enemies?"
: Pope says, "The barons, the merceneries,"
: says, "German princes, Otto, and of course..."
: says, "the Freemasons - most insidious of all!"
11:58:52 Pope @ Lawn East
11:58:53 King Frederick @ Lawn East
: King Frederick says, "You say I am threatened..." 
: says, "but I see no evidence of it."
: Pope says, "You see nothing because I have shielded you well."
: says, "But danger is everywhere!"
: King Frederick says, "Hmm."

11:59:18 Pope @ Central Stairwell
11:59:19 King Frederick @ Central Stairwell
: Pope says, "Wait here one moment, my King."

11:59:22 Pope @ East Hall
: Hugo gives black brick to Pope

11:59:26 Pope @ Central Stairwell
: Pope says, "Let us continue with a briskness."
: Pope says, "Ha ha! It is fun to walk fast!"

11:59:39 Pope @ Courtyard East.10%
11:59:40 King Frederick @ Courtyard East.20%
: King Frederick says, "This tower, I love."
: says, "It has art and symmetry!"
: Pope says, "Yes, the old thing stands apart in style."
: King Frederick @ 50%
: Pope says, "Ah, but you must stand further back!"
: says, "To take it in properly!"
: King Frederick @ 30%
: faces right
11:59:59 says, "I see no advantage-"
12:00:00 hide Arabic Tower
12:00:00 show Arabic Tower Collapsed
: King Frederick lays
: Arabic Tower Collapsed emits "(crash)"
: Pope says, "My King!"
: waits
: King Frederick stands
: says, "I am okay."
: Pope @ 40%
: Pope says, "Just as I suspected!"
: takes black brick into left hand.
: says, "a black brick!"
: @ 20%
: faces King Frederick
: King Frederick faces Pope
: Pope drops black brick
: King Frederick says, "What is this madness?"
: Pope says, "The Freemasons, my King."
: says, "They built this tower with a black brick!"
: says, "A black brick waits til one specific moment..."
: says, "And then it fails, dropping death on the Freemasons' target."
: King Frederick says, "I am so angry."
: Pope says, "Of course! Those devils meant to kill you."
: King Frederick says, "No, not that."
: King Frederick says, "It was a really good tower!"

(11:57 Raniero is in his office)

# Conclusions
