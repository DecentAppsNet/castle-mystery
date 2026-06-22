# General

* title=The Inefficient Court
* activeCharacter=Toro
* time=8:00:00
* background=daySky.png
* imports=items.md | characters.md

# Map

```
.GGGG..........
JGGGGFCCCBBB...
JIIIIFEDHBBBAAA
JMMNNFLDKKKKAAA
```

* A=East Gate
* B=Entrance Hall
* C=Central Hall
* D=Lower Stairwell
* E=Record Room
* F=East Stairwell
* G=Throne Room
* H=Usher's Office
* I=Antechamber
* J=West Stairwell
* K=Deep Archives
* L=Tapestry Store
* M=Withdrawal Chamber
* N=Robing Chamber

# Rooms

## East Gate

* outside=true
* exits=Entrance Hall (closed)

```
.....G......
........T...
.....H......
```

* T=Toro
* G=Guard 1
* H=Guard 2

## Entrance Hall

* exits=Usher's Office (unlocked, unlockable) | Central Hall 


```
..G.........
.......A....
............
```

* A=Andronikos
* G=Guard 3

## Central Hall

* 1=P1
* 2=P2
* 3=P3
* 4=P4
* 5=P5
* 6=P6
* 7=P7
* 8=P8
* 9=P9
* 0=P10

```
............
1234567890..
............
```

* obscured=true
* exits=East Stairwell

## Lower Stairwell

* title=
* exits=Deep Archives (locked, unlockable) | Tapestry Store (locked, unlockable)
* obscured=true

## Record Room

* exits=Lower Stairwell | East Stairwell (locked,unlockable)
* obscured=true

## West Stairwell

* title=
* obscured=true

## Throne Room

* exits=West Stairwell
* obscured=true

```
...A.........U..
..............t.
................
```

* t=Throne|King Frederick
* U=Ugolino
* A=Amos

## Usher's Office

* exits=Entrance Hall (unlockable)

```
CR..
....
....
```

* C=Room Capacities
* R=Petitioner Registry|Petitioner Registry Updated

## Antechamber

* obscured=true
* exits=West Stairwell | East Stairwell

```
................
N1234567890ABCD.
.G..............
```

* N=Niccolo
* 1=P11
* 2=P12
* 3=P13
* 4=P14
* 5=P15
* 6=P16
* 7=P17
* 8=P18
* 9=P19
* 0=P20
* A=P21
* B=P22
* C=P23
* D=P24
* G=Guard 4

## East Stairwell
* title=
* obscured=true

## Deep Archives
* exits=Lower Stairwell (locked)

## Tapestry Store
* exits=Lower Stairwell (locked)

## Withdrawal Chamber
* exits=West Stairwell (closed)

## Robing Chamber
* exits=East Stairwell (closed)

# Characters

## Amos
* facing=left
* isTitleKnown=true

## Andronikos

* items=Wax Tablet | Wax Tablet Updated
(There is only one wax tablet in the story, but the two versions represent a change from one state to another.)

## King Frederick
* facing=left
* orientation=sitting
* isTitleKnown=true

## Niccolo
* isTitleKnown=true
* facing=left

## P1
* faceImage=malePeasant2.png
* facing=left
## P2
* faceImage=oldFemalePeasant2.png
* facing=left
## P3
* faceImage=femalePeasant.png
* facing=left
## P4
* faceImage=oldMalePeasant.png
* facing=left
## P5
* faceImage=femalePeasant2.png
* facing=left
## P6
* faceImage=malePeasant3.png
* facing=left
## P7
* faceImage=oldFemalePeasant.png
* facing=left
## P8
* faceImage=malePeasant4.png
* facing=left
## P9
* faceImage=femalePeasant3.png
* facing=left
## P10
* faceImage=femalePeasant4.png
* facing=left
## P11
* faceImage=oldMalePeasant2.png
* facing=left
## P12
* faceImage=oldFemalePeasant2.png
* facing=left
## P13
* faceImage=malePeasant.png
* facing=left
## P14
* faceImage=malePeasant2.png
* facing=left
## P15
* faceImage=femalePeasant4.png
* facing=left
## P16
* faceImage=oldMalePeasant.png
* facing=left
## P17
* faceImage=malePeasant3.png
* facing=left
## P18
* faceImage=oldFemalePeasant.png
* facing=left
## P19
* faceImage=femalePeasant2.png
* facing=left
## P20
* faceImage=malePeasant4.png
* facing=left
## P21
* faceImage=oldMalePeasant2.png
* facing=left
## P22
* faceImage=femalePeasant.png
* facing=left
## P23
* faceImage=malePeasant3.png
* facing=left
## P24
* faceImage=malePeasant2.png
* facing=left

## Sticky Agatha
* isTitleKnown=true
* facing=left

## Toro
* description=Toro has a bad limp and a bad mood.
* isTitleKnown=true
* items=Black Paint Jar

## Ugolino
* isTitleKnown=true

# Items

## Wax Tablet

* description=Greek numbering of "κϛ" is scratched into the wax.

## Wax Tablet Updated

* image=waxTablet.png
* description=Greek numbering of "κζ" is scratched into the wax.

## Room Capacities
* image=codex.png
* description=For the safety of the King, petitioners in these rooms should not exceed these counts:|Entrance Hall - 1|Central Hall - 12|Antechamber - 16

## Petitioner Registry
* description=17 JULY 1195, TERCE|Konrad of Augsburg - tax relief|Faraj ibn Sa'id al-Balarmi - property dispute|Tancredi of Cefalù - property dispute|Salvatori of Trapani - tax relief
* image=codex.png

## Petitioner Registry Updated
* description=17 JULY 1195, TERCE|Konrad of Augsburg - tax relief|Faraj ibn Sa'id al-Balarmi - property dispute|Tancredi of Cefalù - property dispute|Salvatori of Trapani - tax relief|Toro - treachery
* visible=false
* image=codex.png
* drawOffsetY=2

# Itinerary

8:00:00 Toro @ East Gate

8:00:00 Andronikos @ Entrance Hall
: takes Wax Tablet in right hand
: faces Guard 3
: says "The antechamber is completely full, of course."
: says "In the central hall, we have space for just two more."

8:00:06 Toro @ Entrance Hall.80%
: Andronikos faces Toro
: Andronikos says, "State your name."
: Toro says, "Toro."
: Andronikos says, "What are you here for?"
: Toro says, "Petition. King."
: Andronikos says, "Concerning?"
: Toro says, "TREACHERY!"
: Andronikos says, "Calm yourself."
: Toro says, "Treachery! (whispers loudly)"
: Andronikos says, "Just go up the stairs and wait."
: Toro says, "Gratitude."
(Toro leaves for Central Hall)
: Andronikos thinks, "Toro, like a bull."
: takes Wax Tablet into inventory
: takes Wax Tablet Updated into right hand
: faces Guard 3
: says "He is the size of two men at least."
: says "So we'll admit no more for now."

8:00:30 Toro @ Central Hall.90%
: waits 8
: says "Impatience."
: P10 faces Toro
: waits
: P10 faces left
: waits 3
: Toro says "Frustration."
: P9 faces Toro
: P7 faces Toro
: P6 faces Toro
: says, "We are all frustrated, friend."
: P9 faces left
: waits
: P7 faces left
: waits .5
: P6 faces left
: waits 1
: Toro says "ANGER!"
: P10 faces Toro
: P1 faces Toro
: P2 faces Toro
: P3 faces Toro
: P4 faces Toro
: P5 faces Toro
: P6 faces Toro
: P7 faces Toro
: P8 faces Toro
: P9 faces Toro
: P10 says, "Just go on ahead."
: P8 says, "Yeah, just go."
: Toro says "Gratitude."
(Toro leaves for Antechamber)
8:00:55 P10 faces left
8:00:56 P9 faces left
: P7 faces left
8:00:57 P8 faces left
: P6 faces left
: P4 faces left
8:00:58 P5 faces left
: P3 faces left
: P2 faces left
: P1 faces left

8:00:35 Andronikos @ Usher's Office
: thinks "Let's add this bull to our registry..."
: @ 10%
: hide Petitioner Registry
: show Petitioner Registry Updated
: Andronikos thinks, "Done."
: @ 30%
(returns to Entrance Hall)

8:00:45 Andronikos @ Entrance Hall.50%

8:01:01 Toro @ Antechamber.95%
: waits 3
: says, "ANGER!"
: Niccolo faces Toro
: P11 faces Toro
: P12 faces Toro
: P13 faces Toro
: P14 faces Toro
: P15 faces Toro
: P16 faces Toro
: P17 faces Toro
: P18 faces Toro
: P19 faces Toro
: P20 faces Toro
: P21 faces Toro
: P22 faces Toro
: P23 faces Toro
: P24 faces Toro
: waits
: Guard 4 says, "Shut up or get out."
: Toro says, "(sighs)"
: Niccolo faces left
: waits
: P12 faces left
: P14 faces left
: waits
: P11 faces left
: waits .5
: P13 faces left
: P15 faces left
: P19 faces left
: waits .5
: P16 faces left
: P17 faces left
: P20 faces left
: P22 faces left
: waits 1
: P18 faces left
: P19 faces left
: P23 faces left
: waits .5
: P21 faces left
: P22 faces left
: P24 faces left
: waits 3
(Using an item in Toro's possesion to position emit bubble over his body. Storywise, Toro is emitting the fart noise - not the black paint jar.)
: Black Paint Jar emits "(loud fart)"
: Toro says, "Apologies."
: P24 says "(coughing)"
: P22 says "Ghastly!"
: P18 says "I can come back tomorrow."
(As the crowd clears out, Toro presses forward in line.)
8:01:34 Toro @ 10%
8:01:43 Toro @ 10%
: P21 thinks "It is more than I can endure."
8:01:56 Toro @ 10%
: Guard 4 says, "You have thoroughly befouled this place."
: says, "But I don't mind less people in here."

8:02:03 P1 @ Antechamber.95%
: P1 says, "Has some animal died here?"
: Guard 4 says, "You may wait for audience in this room."
: P1 says, "I... uh..."
: Guard 4 says, "Or you may return to the central hall."
: P1 says, "Yes. That."
: P1 @ Central Hall.10%
: says, "A catastrophe has befallen those in the room ahead."
: P5 says, "Of what manner?"
: P1 says, "I do not know."
: says "But I want no part of it."
: faces left

(Andronikos is in the Entrance Hall, a stream of petitioners are exiting)
8:01:29 Andronikos faces left
: says "Is there some commotion?"
8:01:36 P22 @ Entrance Hall.60%
: Andronikos faces P22
: says "Peasant!"
: P22 faces Andronikos
: Andronikos says, "Why are all these people leaving?"
: P22 says, "The unholy stench of a man-beast's innards pervades the antechamber!"
: Andronikos says, "I do not follow your meaning."
: P22 says, "I fear for my very soul!"
(P22 resumes fleeing to the East Gate)

(Andronikos remains in the Entrance Hall. The clamore of the petitioners fleeing has subsided.)
8:02:07 Andronikos faces Guard 3
: says "I will assess the antechamber."
: says "Admit no petitioners in my absence."
: Guard 3 says, "Of course, sir."
(Andronikos leaves for the antechamber)

8:01:34 P23 @ East Gate.95%
: hide P23
8:01:37 P24 @ East Gate.95%
8:01:38 @ 95%
: hide P24
8:01:39 P20 @ East Gate.95%
8:01:40 @ 95%
: hide P20
8:01:40 P23 @ East Gate.95%
8:01:41 @ 95%
: hide P23
8:01:51 P18 @ East Gate.95%
8:01:52 @ 95%
: hide P18
8:01:44 P17 @ East Gate.95%
8:01:45 @ 95%
: hide P17
8:01:46 P19 @ East Gate.95%
8:01:47 @ 95%
: hide P19
8:01:49 P16 @ East Gate.95%
8:01:50 @ 95%
: hide P16
8:01:52 P15 @ East Gate.95%
8:01:53 @ 95%
: hide P15
8:01:56 P12 @ East Gate.95%
8:01:57 @ 95%
: hide P12
8:01:56 P22 @ East Gate.95%
8:01:58 @ 95%
: hide P22
8:02:00 P13 @ East Gate.95%
8:02:01 @ 95%
: hide P13
8:02:04 P11 @ East Gate.95%
8:02:05 @ 95%
: hide P11
8:02:06 P14 @ East Gate.95%
8:02:07 @ 95%
: hide P14
8:02:12 P21 @ East Gate.95%
8:02:13 @ 95%
: hide P21

8:02:24 Andronikos @ Antechamber.90%
: Andronikos says, "Ohhhh."
: waits
(Andronikos returns to Entrance Hall)

8:02:35 Andronikos @ Entrance Hall.50%
: faces Guard 3
: says, "People complain about drafty castles."
: says, "But today, I wish for ours to be draftier."
: faces right

# Conclusions

* numbers=1|2|3|4|5|6|7|8|9|10|11|12|13|14|15|16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|31|32

## How Many Petitioner?

* conclusion=After Toro joined them, [27] petitioners waited for an audience with the King.
* revealRooms=Central Hall|East Stairwell

