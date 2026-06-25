# General

* title=The Inefficient Court
* activeCharacter=Toro
* time=8:00:00
* background=daySky.png
* imports=items.md | characters.md
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

## Record Room

* exits=Lower Stairwell | East Stairwell (locked,unlockable)
* obscured=true

```
..f.
....
....
```

* f=Furnishing Requests

## West Stairwell

* title=
* obscured=true

```
....
.A..
....
```

* A=Sticky Agatha

## Throne Room

* exits=West Stairwell
* obscured=true

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
* exits=Chamberlain's Office (lockable)

## Deep Archives
* exits=Lower Stairwell (locked)

```
..............b.
................
................
```

* b=Black Brick

## Tapestry Store
* exits=Lower Stairwell (locked)

```
..t.
....
....
```

* t=Tapestry Stack

## Withdrawal Chamber
* exits=Robing Chamber (closed)

```
..t.........
............
............
```

* t=Time of Day Plaque

## Robing Chamber
* exits=East Stairwell (closed)
* obscured=true

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
8:00:05 Sticky Agatha @ Throne Room.20%
: Harold faces Sticky Agatha
: says, "(whispers) What is your name?"
: Sticky Agatha says, "Sticky Agatha."
: Harold faces King Frederick
: says, "Agatha of Stickiness, seeking audience with His Majesty!"
: waits
: says, "Approach and speak."
: Sticky Agatha @ 50%
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
: P21 thinks "I shall endure it."
8:01:56 Toro @ 30%
: Guard 4 says, "You have thoroughly befouled this place."
: says, "But I don't mind less people in here."

8:02:03 P1 @ Antechamber.95%
: P1 says, "Has some animal died?"
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

8:01:12 Harold @ West Stairwell
: says "Next!"
: @ Throne Room.10%
: stands on Small Rug

8:01:18 Niccolo @ Throne Room.20%
: Harold faces Niccolo
: says, "(whispers) Your name?"
: Niccolo says, "Niccolò il Calabrese."
: Harold faces King Frederick
: says, "Niccolò il Calabrese, seeking audience with His Majesty!"
: waits
: says, "Approach and speak."
: Niccolo @ 50%
: says, "Many quarries sell cheap rocks."
: says, "Bad rocks filled with moisture and cracks."
: says, "If the Kingdom is to have strong structures,"
: says, "We must demand quality in our supplies."
: King Frederick says, "Then demand it. How is this my matter?"
: Niccolo says, "Jobs are given to whoever bids lowest."
: says, "But if we had some agreed standard--"
: King Frederick says, "I am familiar with the threat of shoddy masonry."
: says, "And also how a promise of protection..."
: says, "may come from the instigator himself."
: says, "I will not be involved with your scheme."
(Niccolo leaves for East Gate)
8:02:12 Gualtiero faces King Frederick
: says, "I share your outrage, Highness!"
: King Frederick says, "You need not provide your every opinion."
: Gualtiero says, "Ah, I share your opinion of my opinions, Highness!"
: King Frederick says, "(sighs)"
: Gualtiero faces left.

8:01:23 Sticky Agatha @ Robing Chamber
: takes Royal Tunic
: thinks, "This will do."
: @ East Gate.80%
: faces left
: thinks "He was just behind me in line."
: thinks "I will wait for him."

(Andronikos is in the Entrance Hall, a stream of petitioners are exiting)
8:01:29 Andronikos faces left
: says "What is this commotion?"
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

8:01:52 P21 thinks, "It is unendurable."
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

8:02:23 Harold @ West Stairwell
: interrupts "Next... hey!"
: @ Throne Room.10%
: stands on Small Rug

8:02:25 Andronikos @ Antechamber.90%
: Andronikos says, "Ohhhh."
: waits
(Andronikos returns to Entrance Hall)

8:02:24 Toro @ Throne Room.20%
: Toro interrupts, "Toro."
: King Frederick says, "Approach and speak, Toro."
: Harold thinks, "It's like they don't even need a herald!"
: Toro @ 50%
: says, "Pillar. Tower. Palace. Pope."
: says, "Treachery. Brick. Lies!"
: Gualtiero says, "Speak clearly, imbecile!"
: King Frederick says, "Toro, the matter interests me."
: says, "But I do not yet understand."
: Toro takes Black Paint Jar in right hand.
: King Frederick @ 55%
: Toro says "Paint."
: Toro gives Black Paint Jar to King Frederick
: King Frederick takes Black Paint Jar in right hand.
: @ 65%
: says, "Interesting."
: faces Harold
: says, "Herald, fetch the Black Brick."
: Harold says, "Right away, your Majesty."
(Harold leaves for Chamberlain's Office)
: King Frederick waits
: faces right
: says, "While we wait, I will speak on another matter."
: says, "Our petitioning process is a failure."
: Gualtiero says, "Most certainly it is!"
: King Frederick says, "In what exact way, Chamberlain?"
: Gualtiero says, "Oh, uh... I..."
: says, "Hope to hear your thoughts on the subject first."
: King Frederick says, "These people come seeking some gift or mercy from me."
: says, "The World has more complaints than I can hear!"
: Ugolino says, "The Church can hear them, Majesty."
: King Frederick says, "Yes, let God receive their prayers - not I."
: says, "It's more efficient that way."
: Gualtiero says, "Such insight, Majesty."
: King Frederick faces left

8:02:36 Andronikos @ Entrance Hall.50%
: faces Guard 3
: says, "People complain about drafty castles."
: says, "But today, I wish for ours to be draftier."
: faces right
: Guard 3 thinks, "What is he even talking about?"
: Andronikos says, "I shall deposit the Terce records."
: Guard 3 thinks, "I don't care."
: Andronikos @ Usher's Office
: takes Petitioner Registry Updated
: @ Record Room
: drops Petitioner Registry Updated
: thinks, "Let us see if they've withdrawn."
: @ Withdrawal Chamber
: thinks, "No surprise."
: thinks, "Common petitions rarely warrant further discussion."
: @ Tapestry Store.90%
: drops Wax Tablet Updated
: lays on Tapestry Stack
: faces right
: thinks, "Nobody ever comes to this room."
: thinks, "The perfect place for a little nap."

8:02:36 Niccolo @ East Gate.85%
: Sticky Agatha says "Niccoló!" to Niccolo
: Niccolo faces Sticky Agatha
: Sticky Agatha says, "How does Heinrich fare in Master Pietro's House?"
: Niccolo says, "Fair."
: Sticky Agatha says, "He fares fairly?"
: Niccolo says, "Yes."
: Sticky Agatha says, "You seem troubled."
: Niccolo says, "The King gives no support for my mission."
: Sticky Agatha says, "Let us talk elsewhere."
: @ 95%
: hide Niccolo
: Sticky Agatha @ 95%
: hide Sticky Agatha

8:03:12 Harold @ Chamberlain's Office
: thinks, "No, it is not here."
: Harold @ Deep Archives.95%
: takes Black Brick in right hand
: thinks "Heralding is what I do - not fetching!"
: thinks "My mother named me for this destiny."

8:03:58 Harold @ Throne Room.65%
: King Frederick faces left
: Harold gives Black Brick to King Frederick
: King Frederick takes Black Brick in left hand
: Harold stands on small rug
: King Frederick says "Hmm."
: says, "The paint matches."
: Ugolino says, "This jar is from the Lateran Palace."
: says, "Our jar mold bestows this symbol."
: Gualtiero says, "But what does it prove?"
: King Frederick says, "A better question perhaps is..."
: says, "What does it disprove?"
: says, "Toro, you have done a service for the Crown."
: says, "Is there anything you want?"
: Toro says, "Job."
: King Frederick says, "What job can you do?"
: Toro says, "Herald."
: Harold faces right.
: says, "What?"
: King Frederick says, "Granted. You are my new herald."

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
* revealRooms=Throne Room|Record Room|Withdrawal Chamber
* unlockConclusions=Disproof

## Disproof

* conclusion=Pope Innocent III claimed the fallen Arabic tower was constructed by Freemasons using the [Black Brick]. However, it was [painted] using the [Black Paint Jar], which bore a mark of the [Lateran Palace]. This cast doubt on the Pope's claim in the mind of [King Frederick].