# General

* title=Adhoc
* activeCharacter=Pietro
* time=7:30
* background=countryside.png
* imports=items.md | characters.md | roomStyles.md
* winSynopsis=Heinrich and the young King Frederick enjoyed an afternoon of friendship and falconing. Master Mason Pietro tolerated the apprentice leaving work, hoping for a future royal construction project. The seed of conspiracy was planted in a corner of the workshop yard.

# Map

```
SSWW/AA\......
SSFF/KK\YYYYC.
SSMM/HH\YYYYTT
```

* S=Street
* M=Master's Hall
* K=Common Kitchen
* F=Family Quarters
* A=Apprentices' Chamber
* W=Workers' Dormitory
* /=Stairwell
* \=Stairwell 2
* C=Accounts Room
* Y=Workshop Yard
* T=Stone Store
* H=Tool Store

# Rooms

## Street

* outside=true
* exits=Master's Hall (unlocked, lockable)
* style=Town Street Day

```
........
.F......
........
```

* F=King Frederick

## Master's Hall

* exits=Street (lockable) | Stairwell (closed)
* style=Old Castle


```
........
...P....
........
```

* P=Pietro

## Stairwell

* style=Old Castle
* title=
* exits=Workers' Dormitory (unlocked, lockable)


```
....
.A..
....
```

* A=Ahmad

## Family Quarters

* style=Old Castle
* exits=Stairwell (lockable, locked)

## Apprentices' Chamber

* exits=Stairwell (closed) | Stairwell 2 (closed)
* style=Old Castle

```
........
.....H..
........
```

* H=Heinrich

## Workers' Dormitory

* style=Old Castle
* exits=Stairwell (unlocked, lockable)


```
.Iw.....
........
....S...
```

* I=Giorgios
* S=Stefan
* w=Big Wineskin

## Common Kitchen

* exits=Stairwell | Stairwell 2
* style=Old Castle


```
..b..N.p
...M...A
........
```

* M=Maria
* A=Anna
* N=Niccolo
* b=bread roll
* p=painting

## Stairwell 2

* title=
* style=Old Castle
* exits=Tool Store (locked, lockable) | Workshop Yard (closed)

## Tool Store

* style=Old Castle

## Stone Store

* style=Old Castle

## Workshop Yard

* style=Yard
* exits=Stone Store (unlocked, lockable) | Accounts Room (unlocked, lockable)
* outside=true


```
.p.s...c.....u..
...A.Y.G........
................
```

* u=Cutting Station
* c=Masonry Station
* s=Carving Station
* p=Pedestal
* A=Andreas
* G=Giovanni
* Y=Yusuf

## Accounts Room

* style=Old Castle

```
..mc
..S.
....
```

* c=Yard Workers
* m=Monthly Wages
* S=Salomone

# Characters

## Giorgios

* orientation=sitting
* facing=right

## Giovanni

* items=Chisel

## Heinrich

* facing=left
* orientation=laying

## Niccolo

* orientation=sitting

## Pietro

* facing=left
* items=owner's key

## Maria

## King Frederick

* items=Furia Perched

## Salomone

* items=abacus

# Items

## Masonry Station

* image=cutLimestone.png
* description=Rough chunks of limestone are shaped into construction-ready blocks here.
* drawOffsetX=1
* drawOffsetZ=.07

## Pedestal
* drawOffsetX=2

## Cutting Station

* image=uncutLimestone.png
* description=Raw limestone that will be cut into chunks.
* drawOffsetX=1
* drawOffsetZ=.07

## Carving Station

* image=carvingStation.png
* description=Details are applied to ornamental stonework here.
* drawOffsetX=1
* drawOffsetY=.8
* drawOffsetZ=.07

## Owner's Key

## Yard Workers
* image=codex.png
* description=Ahmad - Foreman | Heinrich - Apprentice | Giovanni - Journeyman Mason | Niccoló - Stone Cutter | Giorgios - Master carver | Andreas - Apprentice Carver | Yusuf - Builder and surveyor | Stefan - Quarry laborer

## Monthly Wages
* image=codex.png
* description=Apprentice - 1 denari|Servant (non-family) - 5 denari|Quarry Laborer - 15 denari|Cook/House Manager - 30 denari|Stone Cutter - 2 tari|Journeyman Mason - 3 tari|Journeyman Carver - 4 tari|Foreman - 4 tari|Master Carver - 5 tari|Master Mason - 4 tari|Builder and surveyor - 6 tari|Clerk/accountant - 6 tari

## Painting
* image=mariaPainting.png
* description=A rough drawing with the inscription, "Maria, my forever love -Tommaso"
* drawOffsetZ=-.5
* drawOffsetY=-3

# Itinerary

7:30:00 King Frederick takes Furia Perched in right hand
7:30:01 Stefan goes to Common Kitchen
7:30:02 Ahmad goes to Master's Hall (80%)
7:30:08 Anna goes to Master's Hall
7:30:12 Ahmad goes to Apprentices' Chamber

7:30:00 Pietro @ Master's Hall
7:30:03 Ahmad @ Master's Hall (80%)
7:30:03 Pietro faces right
: says, "Are they up and working, Ahmad?"
: Ahmad says, "I haven't checked yet."
: Pietro says, "Well, you better - that's your job."
: goes (20%)
(Ahmad leaves)
7:30:14 Anna @ Master's Hall
: Pietro faces right
: says, "Daughter, why do you disturb me?"
: Anna says, "You weren't doing anything."
: Pietro says, "I was thinking!"
: says, "A man like me must do a lot of thinking."
: thinks, "(thinking)"
: Anna thinks, "(thinking)"
: Pietro says, "What are you doing?"
: Anna says, "Papa, if both of us think,"
: says, "the work goes twice as fast!"
: Pietro says, "Okay, then think about masonry contracts."
: says, "But do it somewhere else."
(Anna leaves for family quarters)
7:30:40 Pietro faces left

7:30:05 Yusuf thinks, "I must see Anna today."

7:30:06 Stefan @ Common Kitchen
: Maria faces Stefan
: says, "Good morning, my strong young man from Ragusa."
: Stefan faces left
: Stefan says, "Good morning."
: Maria says, "You remind me so much of my dead husband Tommaso."
7:30:12 Stefan goes to Workshop Yard (80%)

7:30:18 Ahmad @ Apprentices' Chamber
: says "Get up!"
: Heinrich stands
: Ahmad says, "I don't care about your royal friend."
: says, "In the House of Rocks, I am your King."
: says, "And the King says, 'get to the yard'!"

7:30:20 Stefan @ Workshop Yard (80%)
7:30:36 faces left
: goes to Stone Store
7:30:39 @ Stone Store
: thinks, "I really don't want to talk to Niccoló."
: thinks, "He's going to complain about cracks again."
: waits 10
: goes Stone Store (30%)
: waits 20
: goes (70%)
: faces left
: waits 10
: goes (50%)
: waits 20
: goes (20%)
: waits 15
: goes (80%)
: waits 20
: goes (60%)

7:30:19 Giovanni goes to Workshop Yard (40%)
7:30:20 Giovanni @ Workshop Yard (40%)
: waits 20
: kneels
(continues working until Heinrich arrives below)

7:30:20 Maria @ Common Kitchen
: faces left
: says, "Niccolò, you know he's going to come"
: says, "and yell at you."
: Niccolo says, "(sigh)"
: stands
: says, "Time to chop rocks."
7:30:37 Maria faces right

7:30:26 Yusuf goes to Accounts Room
7:30:30 Yusuf @ Accounts Room
: says, "Good morning, my friend!"
: Salomone says, "Good morning."
: Yusuf says, "You know I can read, right?"
: Salomone says, "Of course."
: Yusuf says, "In the codex, you list me among the yard workers."
: Salomone says, "Why would I not?"
: Yusuf says, "I visit the yard. But I do not work there."
: Salomone says, "It is just a list."
: Yusuf says, "But is it a correct list?"
: Salomone says, "Correct enough."
: Yusuf says, "I will speak with Pietro about this."
(they both leave)

7:30:33 Ahmad goes to Workers' Dormitory
7:30:37 Ahmad @ Workers' Dormitory
: says, "Drunken fool!"
: says, "Your apprentice starts work well before you."
: says, "And his hands are steady. Are yours?"
: Giorgios says, "My wine is watered." 
: stands
: takes Big Wineskin in right hand
: says, "And my hands are steady for carving."
(Giorgios leaves for Workshop Yard)

7:30:33 Heinrich goes to Common Kitchen (80%)
7:30:37 Heinrich @ Common Kitchen (80%)
: Maria says, "There's still breakfast left for you."
: Heinrich faces left
: Heinrich says, "No time. I'm late!"
: Maria says, "Wait!"


# Conclusions

## Identities

* unlockConclusions=Labor Costs

## Labor Costs

* conclusion=We don't know how much [Pietro di Ruggero di Palermo ] pays himself.---And it's unclear what [Anna di Pietro] is paid, though possibly 5 denari.---But of those whose wages we know, two are paid the most - [Salomone ben David di Palermo] who faces left at 7:32, and [Yusuf ibn Khalaf al-Balarmi] who faces right.