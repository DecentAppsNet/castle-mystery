# General

* title=House of Rocks
* activeCharacter=Ahmad
* time=7:30
* background=countryside.png
* imports=items.md | characters.md

Conclusions:
Identities
Occupations

Things that should happen:
Heinrich gets insulted by the other apprentice.
Heinrich gets told by Giovanni not to waste his time with the Prince. (The relationship can't last, and takes away time from Heinrich's work)
Heinrich gets told by Pietro to spend more time with the Prince. (Maybe it leads to more sales of stone.)
The foreman yells at people for spending too long eating breakfast. Get to work!
Pietro calls out to Heinrich, "your friend is here". 11-year-old Fred is on the street with his falcon. End of scene.

Don't overdo it with story events. Have a bunch of people that just work and don't say/do much.

Arcs




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

```
........
.F......
........
```

* F=King Frederick
* outside=true
* exits=Master's Hall (unlocked, lockable)

## Master's Hall

```
........
...P....
........
```

* P=Pietro
* exits=Street (lockable) | Stairwell (closed)

## Stairwell

```
....
.A..
....
```

* A=Ahmad
* title=
* exits=Workers' Dormitory (unlocked, lockable)

## Family Quarters

* exits=Stairwell (lockable, locked)

## Apprentices' Chamber

```
........
.....H..
........
```

* H=Heinrich
* exits=Stairwell (closed) | Stairwell 2 (closed)

## Workers' Dormitory

```
.Iw.....
........
........
```

* I=Giorgios
* w=Big Wineskin
* exits=Stairwell (unlocked, lockable)

## Common Kitchen

```
..b..N..
...M...A
........
```

* M=Maria
* A=Anna
* N=Niccolo
* b=bread roll
* exits=Stairwell | Stairwell 2

## Stairwell 2

* title=
* exits=Tool Store (locked, lockable) | Workshop Yard

## Tool Store

## Stone Store

## Workshop Yard

```
................
.....Y.G.A....S.
................
```

* A=Andreas
* G=Giovanni
* Y=Yusuf
* S=Stefan
* exits=Stone Store (unlocked, lockable) | Accounts Room (unlocked, lockable)
* outside=true

## Accounts Room

```
....
..S.
....
```

* S=Salomone

# Characters

## Giorgios

* orientation=sitting
* facing=right

## Heinrich

* facing=left
* orientation=laying

## Niccolo

* orientation=sitting

## Pietro

* facing=left
* items=owner's key

## Maria

# Items

## Owner's Key

# Itinerary

7:30:00 Pietro @ Master's Hall
7:30:03 Ahmad @ Master's Hall.80%
7:30:03 Pietro faces right
: says, "Are they up and working, Ahmad?"
: Ahmad says, "I haven't checked yet."
: Pietro says, "Well, you better - that's your job."
: faces left

7:30:18 Ahmad @ Apprentices' Chamber
: says "Get up!"
: Heinrich stands
: Ahmad says, "I don't care about your royal friend."
: says, "In the House of Rocks, I am your King."
: says, "And the King says, 'get to the yard'!"

7:30:20 Maria @ Common Kitchen
: faces left
: says, "Niccolò, you know he's going to come"
: says, "and yell at you."
: says, "(sigh)"
: Niccolo stands
: says, "Time to chop rocks."

7:30:37 Ahmad @ Workers' Dormitory
: says, "Drunken fool!"
: says, "Your apprentice starts work well before you."
: says, "And his hands are steady. Are yours?"
: Giorgios says, "My wine is watered." 
: stands
: takes Big Wineskin in right hand
: says, "And my hands are steady for carving."

7:30:37 Heinrich @ Common Kitchen.80%
: Maria says, "There's still breakfast left for you."
: Heinrich faces left
: Heinrich says, "No time. I'm late!"
: Maria says, "Wait!"
: takes bread roll in left hand
: gives bread roll to Heinrich
: says, "Take it with you."
: Heinrich says, "Thank you so much!"

7:31:00 Ahmad @ Common Kitchen
: says, "Did they linger today?"
: Maria says, "Linger, sir?"
: Ahmad says, "The workers shouldn't linger at breakfast."
: Maria says, "Shall I make my food less delicious?"
: Ahmad says, "No lingering after sun up!"
: Maria says, "Even for you?"
: Ahmad says, "I am not lingering!"

7:30:30 Niccolo @ Workshop Yard

7:30:55 Heinrich @ Workshop Yard

7:31:06 Giorgios @ Workshop Yard

7:31:23 Ahmad @ Workshop Yard