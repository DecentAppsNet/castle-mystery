# General

* title=The Black Brick
* activeCharacter=Helena
* time=11:58:00
* background=daySky.png
* imports=items.md | characters.md
* groundFloorRoom=Lawn


Things that need to happen

Pope takes Black Brick from Hugo and gives an hourglass matching his own to Hugo in the East Hall.

Hugo tells Matteo to push down the pillar the moment the hourglass elapses. "How strong are you?" Matteo only knows a few words and is really stupid.

Helena asks for the key from the Raneiro. She takes the black paint to the Grain store and hides it in the grain, locking the door behind her.

Matteo pushes support pillar down at noon.

The Steward is oblivious to the plot.

Oooh... start the time at 11:58, but there is an obscured room to the west where Pope and Fred enter from. This allows the time to go further back into the past.

Ideally, we can see the painted brick early, and we watch it travel from room to room. It's a key thing to understand who has the brick when.

Steward - only person with key to Grain store, Textile Store, Steward's Office


Black brick starts in Textile Store, laying on ground. Helena comes in room and wonders "who left this here?" Which is ambiguous as to whether she was involved.

She leaves for the Steward's Office and asks Raniero for the key so she can lock up the Textile Store. Raniero gives it to her reminding to bring it back since IT IS THE ONLY KEY.

She locks up the Textile Store from the Cellar. Player doesn't know if the black brick is still inside, unless they see...

Hugo came in to the textile store and took the brick, then went to the west hall (obscured).

Hugo waited in the west hall until Pope came and then gave the Pope the black brick. The pope gave Hugo an hourglass.

Meanwhile, Helena takes a jar of black paint from lower passage avoiding the Steward's office and hides it in the grain store.

Hugo goads Matteo into pushing down pillar. He holds hourglass visibly in one hand.

The Steward remains unaware of the conspiracy.


# Map

```
....CCDE..HHH.
AABBCCDFGGHHH.
...QIIDJJMKKKL
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

```
............
.........H..
............
```
* H=Helena

* exits=East Stairwell (closed) | Textile Store (unlocked, unlockable with Steward's Key)

## Textile Store

```
....
....
..b.
```

* b=Black Brick

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

## Pope

* facing=left

## Raniero

* items=Steward's Key

## Helena

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
* image=brassKey.png

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

(11:58 Helena at right end of wine cellar)
11:58:03 Helena @ Textile Store
: waits
: thinks, "Huh. Who left this here?"
(Helena was referring to the black brick. She leaves for Steward's Office.)

11:58:14 Helena @ Steward's Office
: Helena says, "I need to lock up the textile store."
: Raniero says, "Take my key then, but bring it back!"
: Raniero says, "It's-"
: Helena says, "It's the only one. I know, sir."
: Raniero gives Steward's Key to Helena
: Helena takes Steward's Key in right hand
(Helena leaves for Wine Cellar)

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

11:58:33 Helena @ Wine Cellar.90%
: locks Textile Store

11:59:18 Pope @ Central Stairwell
11:59:19 King Frederick @ Central Stairwell
: Pope says, "Wait here one moment, my King."

11:59:22 Pope @ East Hall
//: Hugo gives black brick to Pope

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
11:59:59 Arabic Tower emits, "(rumble)"
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
//: takes black brick into left hand.
: says, "a black brick!"
: @ 20%
: faces King Frederick
: King Frederick faces Pope
//: Pope drops black brick
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
