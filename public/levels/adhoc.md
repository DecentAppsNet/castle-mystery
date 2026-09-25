# General

* title=Adhoc
* activeCharacter=Toro
* time=8:00:00
* background=daySky.png
* imports=items.md | characters.md | roomStyles.md
* winSynopsis=The King's decisions planted seeds of discontent among two petitioners. Toro's luck changed for the better with a new job. King Frederick resolved to reform administrative procedures to isolate him from his subjects. The Pope became an untrustworthy figure in his eyes.

# Map

```
.GGGGFOO.......
JGGGGFCCCBBB...
JIIIIFEDHBBBAAA
MMMNNFLDKKKKAAA
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
* O=Chamberlain's Office

# Rooms

## East Gate

* outside=true
* exits=Entrance Hall (closed)
* style=Town Street Day

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
* style=Finished


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

* style=Finished
* obscured=true
* exits=East Stairwell

## Lower Stairwell

* title=
* exits=Deep Archives (locked, unlockable) | Tapestry Store (locked, unlockable)
* style=Old Castle

## Record Room

* exits=Lower Stairwell | East Stairwell (locked,unlockable)
* obscured=true
* style=Old Castle

```
..f.
....
....
```

* f=Furnishing Requests

## West Stairwell

* title=
* obscured=true
* style=Old Castle

```
....
.A..
....
```

* A=Sticky Agatha

## Throne Room

* exits=West Stairwell
* obscured=true
* style=Finished

```
...H.....A..G...
..............t.
............U...
```

* t=Throne|King Frederick
* U=Ugolino
* G=Gualtiero
* A=Amos
* H=Small Rug|Harold

## Chamberlain's Office

* exits=East Stairwell (unlocked, lockable)
* style=Finished

```
..c.....
......th
........
```

* c=Chamberlain's Coffer
* h=Chair Left
* t=Walnut Table | Letter about Freemasons

## Usher's Office

* exits=Entrance Hall (unlockable)
* style=Old Castle

```
..CR
....
....
```

* C=Room Capacities
* R=Petitioner Registry|Petitioner Registry Updated

## Antechamber

* obscured=true
* exits=West Stairwell | East Stairwell
* style=Finished

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
* exits=Chamberlain's Office (lockable)
* style=Old Castle

## Deep Archives
* exits=Lower Stairwell (locked)
* style=Old Castle

```
..............b.
................
................
```

* b=Black Brick

## Tapestry Store
* exits=Lower Stairwell (locked)
* style=Old Castle

```
..t.
....
....
```

* t=Tapestry Stack

## Withdrawal Chamber
* exits=Robing Chamber (closed)
* style=Finished

```
..t.........
............
............
```

* t=Time of Day Plaque

## Robing Chamber
* exits=East Stairwell (closed)
* obscured=true
* style=Finished

```
..t.....
........
........
```

* t=Royal Tunic

# Characters

## Amos
* facing=left
* isTitleKnown=true

## Andronikos

* items=Wax Tablet | Wax Tablet Updated
(There is only one wax tablet in the story, but the two versions represent a change from one state to another.)

## King Frederick
* description=The young king seems ill at ease.
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
* description=A woman in her thirties. Oddly sticky.
* isTitleKnown=true

## Toro
* description=Toro has a bad limp and a bad mood.
* isTitleKnown=true
* items=Black Paint Jar

## Ugolino
* description=The Archbishop in the court of King Frederick, far from the Lateran Palace.
* isTitleKnown=true
* facing=left

## Gualtiero
* facing=left

# Items

## Chamberlain's Coffer
* image=coffer.png
* description=A note inside reads:|"Gualti, take your mother's advice. Kings must be praised at every moment. Speak of all others with contempt. By these means, you shall secure a privileged position in court.||-Love, Momiavelli"

## Furnishing Requests
* image=codex.png
* description=The topmost page of the codex reads:|"The table provided to my office is unsuitable. When sat upon my chair, I can scarcely peer over the tabletop. I shall not be perceived by my guests as some child awaiting porridge!|-Gualtiero of Masala"

## Wax Tablet
* description=Greek numbering of "κϛ" is scratched into the wax.

## Wax Tablet Updated
* title=Wax Tablet (Updated)
* image=waxTablet.png
* description=Greek numbering of "κζ" is scratched into the wax.

## Room Capacities
* image=codex.png
* description=For the safety of the King, petitioners in these rooms should not exceed these counts:|Entrance Hall - 1|Central Hall - 12|Antechamber - 16

## Petitioner Registry
* description=17 JULY 1195, TERCE|Konrad of Augsburg - tax relief|Faraj ibn Sa'id al-Balarmi - property dispute|Tancredi of Cefalù - property dispute|Salvatori of Trapani - tax relief
* image=codex.png

## Petitioner Registry Updated
* title=Petitioner Registry (Updated)
* description=17 JULY 1195, TERCE|Konrad of Augsburg - tax relief|Faraj ibn Sa'id al-Balarmi - property dispute|Tancredi of Cefalù - property dispute|Salvatori of Trapani - tax relief|Toro - treachery
* visible=false
* image=codex.png
* drawOffsetY=2

## Letter about Freemasons
* image=letter.png
* drawOffsetY=-2.5
* description=You will hear aspersions toward a group named the "Freemasons". Do they even exist? I have doubts and suspect some deceit from the Lateran Palace. There is opportunity for favorable change in our futures. But we must act with discretion.|-U d C||P.S. Do not leave this letter laying on your desk!

## Time of Day Plaque
* description=Apparently, quite a few of these plaques were mass-produced.

# Itinerary

7:59:57 Toro @ East Gate

7:59:57 Andronikos @ Entrance Hall
: takes Wax Tablet in right hand
: faces Guard 3
: says "The antechamber is completely full, of course."
: says "In the central hall, we have space for just two more."

8:00:06 Toro @ Entrance Hall (80%)
: Andronikos faces Toro
: Andronikos says, "State your name."
: Toro says, "Toro."
: Andronikos says, "What are you here for?"
: Toro says, "Petition. King."
: Andronikos says, "Concerning?"
: Toro says, "TREACHERY!"
: Andronikos says, "Calm yourself."
: Toro says, "(whispers loudly) Treachery!"
: Andronikos says, "Just go up the stairs and wait."
: Toro says, "Gratitude."
(Toro leaves for Central Hall)
: Andronikos thinks, "Toro, like a bull."
: takes Wax Tablet into inventory
: takes Wax Tablet Updated into right hand
: faces Guard 3
: says "He is the size of two men at least."
: says "So we'll admit no more for now."

(Sticky Agatha begins in West Stairwell. The West Stairwell is connected to the Antechamber where a line of people are.)
8:00:05 Sticky Agatha @ Throne Room (20%)
: Harold faces Sticky Agatha
: says, "(whispers) What is your name?"
: Sticky Agatha says, "Sticky Agatha."
: Harold faces King Frederick
: says, "Agatha of Stickiness, seeking audience with His Majesty!"
: waits
: says, "Approach and speak."
: Sticky Agatha @ (50%)
: says "Your Highness,"
: says "I am the mother of your friend, Heinrich."
: says "I wish to open a business in Palermo, washing clothes."
: Gualtiero says, "No permission from this court is required."
: says, "Merely register and pay your taxes."
: Sticky Agatha says, "I offer the King an opportunity..."
: says, "To invest!"
: Gualtiero says, "Oh, you want money!"
: says "So you came here like a street beggar."
: Sticky Agatha says, "I thought the King's friendship with my son-"
: King Frederick says, "If Heinrich needs something, he may ask me himself."
: King Frederick says, "Your request is denied." 
: Gualtiero says, "And why are you so sticky?"
: says, "No sticky woman should clean clothing!"
: Sticky Agatha says, "(weeps)"
: King Frederick says, "Chamberlain, your comments lack grace."
: Gualtiero says, "Forgive my excesses, your Majesty."
(Sticky Agatha leaves for Robing Chamber)

8:00:30 Toro @ Central Hall (90%)
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
: @ (10%)
: hide Petitioner Registry
: show Petitioner Registry Updated
: Andronikos thinks, "Done."
: @ (30%)
(returns to Entrance Hall)

8:00:45 Andronikos @ Entrance Hall (50%)

# Conclusions

* numbers=1|2|3|4|5|6|7|8|9|10|11|12|13|14|15|16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|31|32
* petitioners=Andronikos of Thessalonica|Gualtiero of Masala|King Frederick|Harold of Norwich|Matteo il Toro|Niccolò il Calabrese|Sticky Agatha|Ugolino di Conti
* verbs=thrown|revealed|painted|planted|destroyed|hidden|murdered|poisoned
* marks=King|Freemasons|Lateran Palace|Antichrist|Chamberlain|House of Pietro|Holy Roman Empire
* items=Black Brick|Black Paint Jar|Chamberlain's Coffer|Petitioner Registry|Royal Tunic|Wax Tablet

## How Many Petitioners?

* conclusion=After Toro joined them, [27] petitioners waited for an audience with the King.
* revealRooms=Central Hall|East Stairwell
* unlockConclusions=Something Amiss

## Something Amiss

* conclusion=After petitioning, [Sticky Agatha] took something from the [Robing Chamber].
* revealRooms=Antechamber | West Stairwell | Robing Chamber
* unlockConclusions=Audience Granted

## Audience Granted

* conclusion=List petitioners in order of their appearance before the King.---1. [Sticky Agatha]---2. [Niccolò il Calabrese]---3. [Matteo il Toro]
* revealRooms=Throne Room|Record Room
* unlockConclusions=Disproof

## Disproof

* conclusion=Pope Innocent III claimed the fallen Arabic tower was constructed by Freemasons using the [Black Brick]. However, it was [painted] using the [Black Paint Jar], which bore a mark of the [Lateran Palace]. This cast doubt on the Pope's claim in the mind of [King Frederick].