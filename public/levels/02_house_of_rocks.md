# General

* title=House of Rocks
* activeCharacter=Pietro
* time=7:30
* background=countryside.png
* imports=items.md | characters.md

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
....S...
```

* I=Giorgios
* S=Stefan
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
...s...c.....u..
...A.Y.G........
................
```

* u=Cutting Station
* c=Masonry Station
* s=Carving Station
* A=Andreas
* G=Giovanni
* Y=Yusuf
* exits=Stone Store (unlocked, lockable) | Accounts Room (unlocked, lockable)
* outside=true

## Accounts Room

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

# Itinerary

7:30:00 King Frederick takes Furia Perched in right hand

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
(Anna leaves for family quarters)
7:30:40 Pietro faces left

7:30:06 Stefan @ Common Kitchen
: Maria faces Stefan
: says, "Good morning, my strong young man from Ragusa."
: Stefan faces left
: Stefan says, "Good morning."
: Maria says, "You remind me so much of my dead husband Tommaso."
(Stefan leaves for workshop yard)

7:30:18 Ahmad @ Apprentices' Chamber
: says "Get up!"
: Heinrich stands
: Ahmad says, "I don't care about your royal friend."
: says, "In the House of Rocks, I am your King."
: says, "And the King says, 'get to the yard'!"

7:30:20 Stefan @ Workshop Yard.80%
7:30:36 faces left
7:30:39 @ Stone Store
: thinks, "I really don't want to talk that guy."
: thinks, "He's going to complain about cracks again."
: waits 10
: @ Stone Store.30%
: waits 20
: @ Stone Store.70%
: faces left
: waits 10
: @ Stone Store.50%
: waits 20
: @ Stone Store.20%
: waits 15
: @ Stone Store.80%
: waits 20
: @ Stone Store.60%

7:30:20 Giovanni @ Workshop Yard.40%
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
(Giorgios leaves for Workshop Yard)

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

7:30:44 Anna @ Family Quarters

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
: Pietro faces left
7:31:21 Pietro says, "What?"
: Yusuf says, "The clerk lists me with the yard workers."
: says, "But I go to churches and bridges and castles."
: says, "My work is there - not in the yard."
: Pietro says, "Then we shall make a new list."
: Yusuf says, "Good."
: Pietro says, "And only your name will be on it."
: Yusuf says, "Very good. What is this list?"
: Pietro says, "A list of People Who Complain."
: Yusuf says, "Oh no no no, sir."
: says, "I only wanted your records to be in order."
: Pietro says, "Get back to work."
(Yusuf leaves for tool store)
7:31:54 Salomone says, "Master, I must share some numbers with you."
: Pietro faces Salomone
: Pietro says, "Always with the numbers."
: Salomone says, "Just two numbers."
: says, "The first is 58 tari."
: says, "The second is 0."
: Pietro says "The first number is our income?"
: Salomone says, "No, that is the second number. The first number-"
: Pietro says "Our expenses."
: Salomone says, "Yes."
: Pietro says "Don't worry! More jobs are coming."
: Salomone says, "May we all prosper, sir."
(Salomone leaves for accounts room)
7:32:22 Pietro @ Master's Hall.60%
: faces left

7:30:40 Niccolo @ Workshop Yard.90%
: waits 10
: @ Workshop Yard.80%
: waits 20
: @ Workshop Yard.90%
: waits 10
: faces left
: waits 3
: @ Workshop Yard.70%
: waits 10
: @ Workshop Yard.90%
: faces left
: kneels
: waits 20
: thinks, "(thinking dark thoughts)"
: stands
: @ Workshop Yard.80%
: waits 10
: @ Workshop Yard.90%
: faces left
: kneels
: waits 20
: @ Workshop Yard.70%
(leaves cutting station for stone store)

7:30:56 Heinrich @ Workshop Yard
: Giovanni faces Heinrich
: says, "Apprentice, you're finally here."
: says, "Oil my tool!"
: Andreas says, "(snickers)"
: Giovanni says, "Oh, shut up."
: takes chisel in right hand
: gives chisel to Heinrich
(Giovanni follows Heinrich to the Tool Store)

7:31:06 Giorgios @ Workshop Yard.20%
: says, "Boy, your carves are fair."
: Andreas faces Giorgios
: Giorgios says, "But bring the blade toward your body"
: says, "with a fast jerking motion."
: says, "It is safer."
: says, "Also, do you want some wine?"
: Andreas says, "I am thirsty. Do you have water?"
: Giorgios says, "The wine has some water in it."
: Andreas says, "No, thank you, sir."
: Giorgios @ 10%
: drops Big Wineskin (0, .5, 0)
: @ 30%
: faces left
: waits 10
: takes Big Wineskin in right hand
: Big Wineskin emits "(glug, glug)"
: drops Big Wineskin (0, .5, 0)
: @ 30%
: faces left
: waits 10
: takes Big Wineskin in right hand
: Big Wineskin emits "(glug, glug)"
: drops Big Wineskin (0, .5, 0)
: @ 30%
: faces left
: sits
: says, "Yer doon... sho good!"
: Andreas faces Giorgios
: says, "Sorry, sir?"
: Giorgios says, "I shed..."
: Giorgios says, "Yer doon sho good!"
: Andreas faces left
: says, "Thank you, sir."
: Giorgios takes Big Wineskin in right hand
: Big Wineskin emits "(glug, glug)"
: drops Big Wineskin (0, .5, 0)
: @ 30%
: lays
: waits
: says, "Ish a byooty full..."
: says, "Byooty full day!"

7:31:08 Heinrich @ Tool Store.30%
7:31:10 Giovanni @ Tool Store.60%
: says, "Listen,"
: Heinrich faces Giovanni
: Giovanni says, "Kings don't make good friends."
: says "But a good rock?" 
: says "It will never let you down!"
: says "Set your mind on rocks."
: Heinrich says, "Thank you for your guidance, sir."
(Giovanni leaves for workshop yard)

7:31:23 Ahmad @ Workshop Yard
: waits 20
: @ 80%
: waits 20
@ 50%
: waits 5
: Ahmad @ 40%
: faces Giorgios
: says, "Take yourself and "
: says, "your ridiculously large wineskin out of my yard!"
: says, "No pay for today."
: Giorgios waits
: takes Big Wineskin in right hand
: Big Wineskin emits "(glug, glug)"
(Giorgios leaves for Workers dorm)
7:32:25 Ahmad says, "(sigh)"
: faces right
: waits 20
: @ 30%
7:32:52 Ahmad faces right

7:31:28 Giovanni @ Workshop Yard
: waits 20
: @ 40%
: kneels
: faces right
: thinks, "(thinks about rocks)"
: waits 20
: @ 55%
: waits 10
: @ 40%
: kneels
: faces right
: waits 30
: @ 60%
: thinks, "(thinks about rocks some more)"

7:32:08 Yusuf @ Tool Store.60%
: @ Tool Store.80%
: @ Tool Store.40%
: @ Tool Store.60%
: faces Heinrich
: Yusuf says "Have you seen my abacus?"
: Heinrich says "Not in here."
: Yusuf says "Don't you understand I need it?"
: Heinrich says "Pardon, sir. I will look for it."
: Yusuf says "Sorry. I'm just in a bad mood."
: says "It's that Salomone."
: says "He always acts superior to me."
: says "Yet we are paid exactly the same!"
: Heinrich says "I will look for the abacus."
(Heinrich leaves for the Accounts Room)
(Yusuf leaves for the Family Quarters)

7:32:25 King Frederick @ Master's Hall.10%
: Pietro kneels
: says, "Your Majesty. Such an honor to receive you!"
: King Frederick says, "Please rise, Master Mason."
: Pietro stands
: King Frederick says, "Is Heinrich here?"
: Pietro says, "Of course. Shall I fetch him for you?"
: King Frederick says, "Yes, I thought we'd go falconing."
: Pietro says, "Majesty, did I ever show you my stones?"
: King Frederick says, "I've seen many stones. They are all the same."
: Pietro says, "Oh, no, Majesty. My stones are quite special."
: says, "I would love to show them to you."
: King Frederick says, "I shall ask my falcon."
: says, "Furia, do you wish to see this man's special stones?"
: Furia Perched emits "(squawk)"
: King Frederick says, "She prefers to fly in the air and hunt."
: Pietro says "I shall return with Heinrich shortly, my King."

7:32:35 Yusuf @ Apprentices' Chamber
: @ Family Quarters
: Anna says, "You cannot be here!"
: Yusuf says, "I needed to be near you."
: Anna faces Yusuf.
: Anna says, "I am spurning you, do you understand?"
: says, "Spurn, spurn, spurn!"
: Yusuf says, "But I'm having a really bad day."
: Anna says, "You have been spurned."
: Yusuf says, "But can I just-"
: Anna says, "No! Get out!"
: says, "I'm busy helping my father think!"
: thinks, "(thinking)"
: thinks, "(thinking very hard)"

7:32:35 Giorgios @ Workers' Dormitory.10%
: drops Big Wineskin
: lays

7:32:39 Heinrich @ Accounts Room.90%
7:32:42 Salomone @ Accounts Room
: says, "What are you doing here?"
: Heinrich faces Salomone
: Heinrich says, "Looking for the abacus, sir."
: Salomone says, "Does the surveyor need it again?"
: Heinrich says, "Yes."
: Salomone gives abacus to Heinrich
: says, "There you have it."
: Heinrich says, "Thank you, sir."

7:32:53 Niccolo @ Stone Store
: Niccolo says, "What kind of garbage limestone is this?"
: Stefan faces Niccolo
: Stefan says, "What? It's fine."
: Niccolo says, "It's full of cracks."
: Stefan says, "So use them. Easier to cut, right?"
: Niccolo says, "I'll be lucky to cut three blocks out of it."
: Stefan says, "Look, Pietro bought from Monte Pellegrino."
: Niccolo says, "The worst quarry in Palermo."
: says, "Even the most simple things"
: says, "are done cheaply and poorly now."
: says, "There is no love of craft!"
: Stefan says, "I..."
: Stefan says, "would like to stop talking to you now."

7:32:59 Heinrich @ Workshop Yard

7:33:06 Yusuf @ Stairwell
: says, "She is insane!"