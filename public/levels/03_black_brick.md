# General

* title=The Black Brick
* activeCharacter=King Frederick
* time=11:58:00
* background=daySky.png
* imports=items.md | characters.md
* groundFloorRoom=Lawn
* winSynopsis=The Pope's convoluted caper was executed flawlessly. He aimed to scare young King Frederick. But who knows what effect the collapsed tower had on the boy?

# Map

```
....CCDE..HHH.
AABBCCDFGGHHH.
...QIIDJJMKKKL
...QOOOPPMNNN.
...QRRRRRM....
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
* O=Liturgical Vault
* Q=West Stairwell
* R=Lower Passage

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
..h.
..H.
....
```

* h=Small Hourglass
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

* exits=East Stairwell (closed) | Textile Store (unlocked, unlockable with Steward's Key)

```
............
....T....H..
........p...
```
* H=Helena
* T=Toro
* p=Pillar|Rubble

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

```
............
.....b.o.w..
............
```

* b=Barley Bin
* o=Oat Bin
* w=Wheat Bin

## Steward's Office

* exits=East Stairwell (locked, unlockable with Steward's Key)

```
.......t
..Sw....
........
```

* t=Time of Day Plaque
* w=Walnut Table|Staff List
* S=Raniero

## Liturgical Vault

* exits=West Stairwell (closed)

```
...p........
............
............
```

* p=Black Paint Jar

## West Stairwell

* title=

## Lower Passage

* exits=West Stairwell (closed) | East Stairwell (closed)

# Characters

## Hugo

## King Frederick
* description=His friends still call him "Constantine".
* isTitleKnown=true

## Pope
* description=If a man names himself "Innocent", just how innocent will he be?
* facing=left
* isTitleKnown=true

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

## Barley Bin
* drawOffsetY=.5

## Oat Bin
* drawOffsetY=.5

## Pillar
* description=A pillar. Maybe load-bearing. Or maybe just ornamental.

## Rubble
* description=A massive pile of rubble, fallen from a new hole in the ceiling.
* visible=false
* drawOffsetX=-1
* drawOffsetY=1.5

## Steward's Key
* description=An ordinary key. It probably unlocks some things.
* image=brassKey.png

## Time of Day Plaque
* description=Not a clock. Not a calendar. It tells you what the key moments are in any given day.

## Walnut Table
* description=An unusually high desk.

## Staff List
* description=Helena of Gaeta - Keeper of Textiles | Matteo il Toro - Cellarer | Hugo of Speyer - Guard Sargeant | Raniero de Stefano - Steward
* image=codex.png
* drawOffsetY=-2.5
* drawOffsetZ=-.1
* drawOffsetX=1

## Wheat Bin
* drawOffsetY=.5

# Itinerary

(11:58 Pope and Frederick are at West Lawn)
11:58:00 Pope says, "Welcome to the Lateran Palace, my boy."
: King Frederick says, "It is nice here."
: Pope says, "''Nice'', you say?"
: Pope says, "You stand at the very heart of Christendom!"
: King Frederick says, "It's more a collection of buildings than a palace."
: Pope says, "Hrmph."

(11:58 Raniero is in the Steward's Office standing behind a desk that comes up to his eyes.)
11:58:02 Raniero thinks, "My desk is the perfect height."
: thinks, "If I stand instead of sitting..."
: thinks, "My abdomen will form the shape of six!"
: thinks, "Rather than the shape of one."

(11:58 Helena at right end of wine cellar)
11:58:03 Helena @ Textile Store
: thinks, "Huh. Who left this here?"
: waits
(Helena was referring to the black brick. She leaves for Steward's Office.)
11:58:08 Toro faces left

(11:58 Hugo is in the guard chamber)
11:58:02 Hugo takes Small Hourglass
11:58:17 Toro faces right
11:58:19 Hugo @ Textile Store
: takes Black Brick
: Hugo @ Central Stairwell
11:58:24 Toro faces left

11:58:14 Helena @ Steward's Office.60%
: Helena says, "I need to lock up the textile store."
: Raniero says, "Take my key then, but bring it back!"
: Raniero says, "It's-"
: Helena says, "It's the only one. I know, sir."
: Raniero gives Steward's Key to Helena
: Helena takes Steward's Key in right hand
: Raniero @ 30%
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

11:58:41 Hugo thinks, "His schemes are always so complicated."

11:58:52 Pope @ Lawn East
11:58:53 King Frederick @ Lawn East
: King Frederick says, "You say I am threatened..." 
: says, "but I see no evidence of it."
: Pope says, "You see nothing because I have shielded you well."
: says, "But danger is everywhere!"
: King Frederick says, "Hmm."

(Helena walks by Toro in the Wine Cellar)
11:58:30 Toro says, "Key!"
11:58:32 faces right

11:58:33 Helena @ Wine Cellar.90%
: locks Textile Store
11:58:36 Toro says, "Door!"
: Helena says, "That's right. I have a key."
: says, "I used it to lock the door."
: Toro says, "Door."
: Helena says, "You want to try an adjective today?"
: Toro says, "Adjective."
: Helena says, "(sigh)"
(Helena leaves for the Liturgical Vault)
11:58:53 Toro faces left.

(Raniero remains in his office)
11:58:35 Raniero thinks, "As soon as she returns with my key..."
: says, "I shall be free to frolic in the bins."

11:58:52 Raniero thinks, "It is hard to stand so much."
: thinks, "What if I got a tall chair?"
: thinks, "I would sit only when very tired."

11:59:00 Helena @ West Hall
: @ Liturgical Vault.10%
: Helena takes Black Paint Jar in left hand
: @ Lower Passage
11:59:32 @ Grain Store.40%
: drops Black Paint Jar
: thinks "I'll hide it deep in the grain."
: hide Black Paint Jar
11:59:38 Raniero @ Grain Store.20%
: Raniero says, "What are you doing in here?"
: Helena faces Raniero
: Helena says, "I have a confession!"
: Raniero says, "Yes?"
: Helena says, "I..."
: says, "I love to get inside the bins and..."
: says, "step on the little grains with my bare feet!"
: Raniero says, "Me too!"
: says, "It has been my secret pleasure."
: says, "But now we can do it together!"
: Helena thinks, "Great."
12:00:00 emits "(massive boom)"
: Raniero faces left
: says, "What was that?"
(Raniero and Helena leave for the Wine Cellar)

11:59:06 Raniero faces right
: thinks, "She is taking forever!"
: thinks, "I shall go find her."
: @ Wine Cellar.90%
: thinks, "Locked. And she's not here."
11:59:17 Toro faces Raniero

11:59:18 Pope @ Central Stairwell
11:59:19 King Frederick @ Central Stairwell
: Pope says, "Wait here one moment, my King."

11:59:18 Hugo @ East Hall.40%
11:59:21 Pope @ East Hall.20%
: Hugo gives black brick to Pope
: Hugo takes small hourglass in right hand
: Pope says, "Use the hourglass."
(Hugo leaves for cellar)

(Helena is in the lower passage, holding the black paint jar)
11:59:19 Helena thinks, "Why did he have me paint a brick?"
: thinks "No crime in itself."
: thinks "But what dark plan am I a part of?"

11:59:26 Pope @ Central Stairwell
: Pope says, "Let us continue with a briskness."
: Pope says, "Ha ha! It is fun to walk fast!"

11:59:32 Toro faces left

11:59:38 Hugo @ Wine Cellar.30%
: says, "They say you are strong..."
: says, "Like a bull!"
: Toro says, "Truth."
: Hugo says, "Are you strong?"
: Toro says, "Toro! Strength!"
: Hugo says, "But Helena said you are weak."
: Toro says, "Lies!"
: Hugo says, "Show me. Smash that pillar!"
: Toro faces right.
: Toro says, "Toro! Toro! Toro!"

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
(The Arabic tower collapses in the direction of King Frederick. It nearly hits the King, and would have if he were still standing close to it.)
: King Frederick lays
: Arabic Tower Collapsed emits "(crash)"
: Pope says, "My King!"
: waits
: King Frederick stands
: says, "I am okay."
: Pope @ 40%
: Pope says, "Just as I suspected! Here in the rubble..."
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
: faces right

11:59:55 Toro @ 75%
11:59:56 Hugo says, "Do it now!"
: Toro says, "Arrrrrrgh!"
: Toro says, "RAWWWWWRRRHGH!"
12:00:00 hide Pillar
: show Rubble
(The pillar collapsed from Toro's pushing, and rubble from the ceiling fell down and buried Toro beneath it. Toro's body, barely visible, is moving slightly beneath the rubble.)
: Toro lays
: rubble emits "(crash)"
: Hugo waits
: takes Small Hourglass into inventory
: says, "Thank you, my strong, stupid bull."
: says, "You've brought us victory."

12:00:10 Raniero @ Wine Cellar.20%
12:00:11 Helena @ Wine Cellar.20%
: Raniero says, "What happened?"
: Hugo says, "Toro pushed the pillar down."
: Toro says, "Pain!"
: Helena says, "He's still alive!"
: Hugo says, "Oh, good."
: Helena @ 50%
: Raniero @ 50%
: says, "But why would he do that?"
: Toro says, "Hugo!"
: Hugo says, "I am here, old friend!"
: Toro says, "Conspiracy!"
: Hugo says, "You were involved in a conspiracy?"
: Toro says, "Hugo! Guilt!"
: Hugo says, "You feel guilty about conspiring?"
: Raniero says, "It is so hard to understand him."
: says, "He can only speak in nouns."

# Conclusions

* suspects=Pope Innocent III|the Freemasons|Helena|Raniero|Toro|Hugo|King Frederick|Nobody|The wind
* knockedVerbs=paid|amused|seduced|blackmailed|goaded|murdered
* aftermathVerbs=fall|hide|disappear|succeed|speak|initiate|deceive|murder
* popeActions=discovered|cremated|painted|planted|rebuked|salvaged
* numbers=one|two|three|four|five|six
* items=Arabic Tower | Barley Bin | Black Brick | Black Paint Jar | Oat Bin | Pillar | Rubble | Small Hourglass | Staff List | Steward's Key | Walnut Table | Wheat Bin

## identities

* unlockConclusions=Collapse of a Tower

## Collapse of a Tower
* conclusion=[Toro] pushed down the [pillar], because [Hugo] [goaded] him. This caused the [Arabic Tower] to [fall].

* unlockConclusions=Chain of Custody

## Chain of Custody

* conclusion=These people carried or saw the Black Brick.---1. [Helena of Gaeta] noticed it in the [Textile Store], but did not pick it up.---2. [Hugo of Speyer] snatched the brick.---3. [Hugo of Speyer] gave the brick to [Pope Innocent III] in the [East Hall].---4. [Pope Innocent III] [planted] it in the [rubble|Arabic Tower], attempting to [deceive] [King Frederick].