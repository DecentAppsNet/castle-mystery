# General

* title=adhoc
* activeCharacter=Niccolo
* time:22:59:30
* background=nightSky.png
* groundFloorRoom=Forest
* imports=items.md | characters.md | roomStyles.md

The crypt is obscured until player guesses identities of each masked individual. They have the dropdown of Niccolo, Yusuf, Giorgios, Harold, Hugo, Giovanni, Sticky Agatha. There will be some way to confirm that Agatha did not enter the nave, which is half-constructed.

Voices heard from the crypt. One person (Hugo) says, "Oh, I prefer to keep mine on." It is allowed.

Hugo says, "Fellow freemasons, what is our next plan? I am ready to do my part!"

Niccolo, "Freemasons? We're not freemasons."

Hugo says, "You're not? I really thought you were."

Niccolo, "We haven't even picked a name yet."

Hugo says, "Oh, then my apologies. I'm at the wrong meeting." Hugo leaves.

Niccolo, "They've just been using that fake name to rile people up. There are no freemasons."

Yusuf, "But what if... we were the freemasons?"

Niccolo, "I don't understand."

Yusuf, "The Pope knows freemasons aren't real. If we choose the same name for ourselves."

Niccolo, "Our actions will blend in with the rumors he himself started."

Yusuf, "It gives us cover!"

Harold, "So I'm a freemason now?"

Niccolo, "Yes! Oh, but actually... you're more a freeherald. Something like that."


Hugo meets Ugolino nearby. "My apologies, Father. They are not freemasons."
Ugolino, "It is as I said then. The freemasons are a fiction. Let our minds stay clear about it."


# Map

```
........H.
........HE
..CCAAAGFE
DDCCAAABBE
.........E
.....IIIIE
```

* A=Nave
* B=Hall
* C=Entrance
* D=Forest
* E=Stairwell
* F=Sacristy
* G=Sacristan's Quarters
* H=Bell Tower
* I=Crypt

# Rooms

## Entrance

* style=Palace Garden
* exits=Nave (unlocked, lockable) | Forest
* outside=true

## Forest

* style=Woods Night
* outside=true

```
........
..AN....
........
```

* A=Sticky Agatha
* N=Niccolo

## Nave

* style=Old Castle
* backWallTexture=greyBricks2.png | aged stone | naveWindows.png (*,*)
* exits=Hall | Entrance (lockable)

```
..1.2w3.4...
............
..5.6.7.8...
```

* 1=Pew 1|Harold
* 2=Pew 2|Giorgios
* 3=Pew 3
* 4=Pew 4|Yusuf
* 5=Pew 5|Giovanni
* 6=Pew 6
* 7=Pew 7|Hugo
* 8=Pew 8
* w=Big Wineskin

## Hall
* obscured=true
* style=Old Castle
* exits=Stairwell

## Stairwell
* obscured=true
* style=Old Castle
* title=

## Bell Tower
* style=Old Castle
* exits=Stairwell

## Sacristy
* style=Old Castle
* exits=Stairwell | Sacristan's Quarters (locked, lockable)

## Sacristan's Quarters
* style=Old Castle
* exits=Sacristy (lockable)

## Crypt
* style=Old Castle
* obscured=true
* exits=Stairwell

# Characters

## Sticky Agatha
* isTitleKnown=true

## Niccolo
* isTitleKnown=true
* description=A man holding dark thoughts on a dark night.
* items=Pig Mask

### Masked
* faceImage=pigMask.png
* description=The same person we saw earlier - just with a mask on.

## Harold 
* orientation=sitting
* items=Goat Mask
* facing=right
* appearsAs=Masked

### Masked
* faceImage=goatMask.png
* description=The same person we saw much earlier - just with a mask on.

## Hugo
* title=Hugo of Speyer
* items=Horse Mask
* facing=right
* orientation=sitting
* appearsAs=Masked

### Masked
* faceImage=horseMask.png
* description=The same person we saw much earlier - just with a mask on.

## Giorgios 
* title=Giorgios tou Nikolaou
* items=Bull Mask
* orientation=sitting
* facing=right
* appearsAs=Masked

### Masked
* faceImage=bullMask.png
* description=The same person we saw much earlier - just with a mask on.

## Yusuf 
* title=Yusuf ibn Khalaf al-Balarmi
* orientation=sitting
* items=Rabbit Mask
* facing=right
* appearsAs=Masked

### Masked
* faceImage=rabbitMask.png
* description=The same person we saw much earlier - just with a mask on.

## Giovanni 
* title=Giovanni di Leone di Monreale
* items=Stag Mask
* orientation=sitting
* facing=right
* appearsAs=Masked

### Masked
* faceImage=stagMask.png
* description=The same person we saw much earlier - just with a mask on.

# Items

## Pew 1
* image=chairRight.png
* stackOffsetY=.9
* stackOffsetX=-.5

## Pew 2
* image=chairRight.png
* stackOffsetY=.9
* stackOffsetX=-.5

## Pew 3
* image=chairRight.png
* stackOffsetY=.9
* stackOffsetX=-.5

## Pew 4
* image=chairRight.png
* stackOffsetY=.9
* stackOffsetX=-.5

## Pew 5
* image=chairRight.png
* stackOffsetY=.9
* stackOffsetX=-.5

## Pew 6
* image=chairRight.png
* stackOffsetY=.9
* stackOffsetX=-.5

## Pew 7
* image=chairRight.png
* stackOffsetY=.9
* stackOffsetX=-.5

## Pew 8
* image=chairRight.png
* stackOffsetY=.9
* stackOffsetX=-.5

# Itinerary

22:59:30 Niccolo says, "I was thinking we might get a hundred people." to Sticky Agatha
: Sticky Agatha says, "We've got five."
: Niccolo says, "Five hundred!"
: Sticky Agatha says, "No. I only found five."
: Niccolo says, "Well, we must start somewhere."
: Sticky Agatha says "Put on your mask!"
: Niccolo says, "Oh, right."
: appears Masked
: Sticky Agatha says, "I'll stay here and keep watch."
22:59:45 Niccolo goes to Nave (80%)

(Niccolo enters Nave, and everybody turns to look at him)
22:59:48 Harold faces left
: Giovanni faces left
: Hugo faces left
: Yusuf faces left
: Giorgios faces left

22:59:50 Harold faces right
22:59:51 Giorgios faces right
: Giovanni faces right
22:59:52 Niccolo @ Nave (80%)


# Conclusions

* characters=Ahmad ibn Faraj al-Balarmi | Giorgios tou Nikolaou | Giovanni di Leone di Monreale | Gualtiero of Masala | Harold of Norwich | Hugo of Speyer | Matteo il Toro | Niccolò il Calabrese | Pietro di Ruggero di Palermo | Raniero de Stefano | Salomone ben David di Palermo | Stefan of Ragusa | Sticky Agatha | Ugolino di Conti | Yusuf ibn Khalaf al-Balarmi

## Costumes

* conclusion=[Niccolò il Calabrese] disguised themself as a pig.
* revealRooms=Hall

## One More

* conclusion=[Sticky Agatha] donned no disguise at all.