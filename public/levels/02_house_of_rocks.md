# General

* title=House of Rocks
* activeCharacter=Pietro
* time=7:30
* background=countryside.png
* imports=items.md | characters.md


Things that should happen:
The foreman yells at people for spending too long eating breakfast. Get to work!
Pietro calls out to Heinrich, "your friend is here". 11-year-old Fred is on the street with his falcon. End of scene.

Don't overdo it with story events. Have a bunch of people that just work and don't say/do much.






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
...c
..S.
....
```

* c=Yard Workers
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

# Items

## Owner's Key

## Yard Workers
* image=codex.png
* description=Ahmad - Foreman | Heinrich - Apprentice | Giovanni - Journeyman Mason | Niccoló - Stone Cutter | Giorgios - Master carver | Andreas - Apprentice Carver | Yusuf - Builder and surveyor | Stefan - Quarry laborer

# Itinerary

7:30:00 Pietro @ Master's Hall
7:30:03 Ahmad @ Master's Hall.80%
7:30:03 Pietro faces right
: says, "Are they up and working, Ahmad?"
: Ahmad says, "I haven't checked yet."
: Pietro says, "Well, you better - that's your job."
: Pietro @ Master's Hall.20%
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
(Anna leaves)

7:30:44 Anna @ Family Quarters

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
: Niccolo says, "(sigh)"
: stands
: says, "Time to chop rocks."
7:30:37 Maria faces right

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
: Heinrich says, "Thank you, ma'am."
: takes bread roll into inventory

7:31:00 Ahmad @ Common Kitchen
: says, "Did they linger today?"
: Maria says, "Linger, sir?"
: Ahmad says, "The workers shouldn't linger at breakfast."
: Maria says, "Shall I make my food less delicious?"
: Ahmad says, "No lingering after sun up!"
: Maria says, "Even for you?"
: Ahmad says, "I am not lingering!"


7:31:19 Yusuf @ Master's Hall
7:31:20 Salomone @ Master's Hall
7:31:21 Pietro says, "What?"
: Yusuf says, "The clerk lists me with the yard workers."
: says, "But I go to the churches and bridges and castles."
: says, "My work is there - not in the yard."
: Pietro says, "Then we shall make a new list."
: Yusuf says, "Good."
: Pietro says, "And only your name will be on it."
: Yusuf says, "Very good. What is this list?"
: Pietro says, "A list of people who complain."
: Yusuf says, "Oh no no no, sir."
: says, "I only wanted your records to be in order."
: Pietro says, "Get back to work."
(Yusuf and Salomone leave)

7:30:40 Niccolo @ Workshop Yard

7:30:55 Heinrich @ Workshop Yard
: Giovanni faces Heinrich
: says, "Apprentice, you're finally here."
: says, "Oil my tool!"
: Andreas says, "(snickers)"
: Giovanni says, "Oh, shut up."
: takes chisel in right hand
: gives chisel to Heinrich

7:31:06 Giorgios @ Workshop Yard

7:31:08 Heinrich @ Tool Store.30%
7:31:10 Giovanni @ Tool Store.60%
: says, "Listen,"
: Heinrich faces Giovanni
: Giovanni says, "Kings don't make good friends."
: says "But a good rock?" 
: says "It will never let you down!"
: says "Set your mind on rocks."



7:31:23 Ahmad @ Workshop Yard