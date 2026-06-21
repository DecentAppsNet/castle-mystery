# General

* title=The Inefficient Court
* activeCharacter=Toro
* time=8:00:00
* background=daySky.png
* imports=items.md | characters.md


Androniko's puzzle

From the Usher's Office, the central hall maximum capacity is 12 and antechamber is 16. (Total 28)

Before Toro comes in, Androniko says to the guard.

The antechamber is completely full, of course.
In the central hall, we have space for just two more.

After Toro goes up, Androniko says to the guard, "That Toro is the size of two men."
"So we will admit no more petitioners for the moment."



# Map

```
.GGGG..........
JGGGGFCCCBBB...
JIIIIFEDHBBBAAA
.......D....AAA
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

* exits=Usher's Office (unlocked) | Central Hall 


```
..G.........
.......A....
............
```

* A=Andronikos
* G=Guard 3

## Central Hall

* obscured=true
* exits=East Stairwell

## Lower Stairwell

* obscured=true

## Record Room

* exits=Lower Stairwell
* obscured=true

## West Stairwell

* obscured=true

## Throne Room

* exits=West Stairwell
* obscured=true

## Usher's Office

```
CR..
....
....
```

* C=Room Capacities
* R=Registry|Registry Updated

## Antechamber

* obscured=true
* exits=West Stairwell | East Stairwell

```
................
................
.G..............
```

* G=Guard 4

## East Stairwell

* obscured=true

# Characters

## Andronikos

* items=Wax Tablet | Wax Tablet Updated
(There is only one wax tablet in the story, but the two versions represent a change from one state to another.)

## Toro

* description=Toro has a bad limp and a bad mood.
* isTitleKnown=true

# Items

## Wax Tablet

* description=Greek numbering of "κϛʹ" is scratched into the wax. Just below it says "Σαλβατόρε ἐκ Τραπάνης".

## Wax Tablet Updated

* image=waxTablet.png
* description=Greek numbering of "κζʹ" is scratched into the wax. Just below it says "Τόρος".

## Room Capacities
* image=codex.png
* description=Petitioners in high numbers bring danger. For the safety of the King, do not exceed room capacities.|Entrance Hall - 1|Central Hall - 12|Antechamber - 28

## Registry
* description=17 JULY 1195, TERCE|Konrad of Augsburg|Faraj ibn Sa'id al-Balarmi|Tancredi of Cefalù|Salvatori of Trapani|(previous pages of registry omitted)
* image=codex.png

## Registry Updated
* description=17 JULY 1195, TERCE|Konrad of Augsburg|Faraj ibn Sa'id al-Balarmi|Tancredi of Cefalù|Salvatori of Trapani|Toro|(previous pages of registry omitted)
* visible=false
* image=codex.png

# Itinerary

8:00:00 Toro @ East Gate

8:00:00 Andronikos @ Entrance Hall
: takes Wax Tablet in right hand
: faces Guard 3
: says "The antechamber is completely full, of course."
: says "In the central hall, we have space for just two more."

8:00:05 Toro @ Entrance Hall.80%
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

8:00:35 Andronikos @ Usher's Office
: thinks "Let's add this bull to our registry..."
: @ 10%
: hide Registry
: show Registry Updated
: Andronikos thinks, "Done."
: @ 30%
