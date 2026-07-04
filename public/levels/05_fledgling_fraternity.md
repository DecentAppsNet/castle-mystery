# General

* title=The Fledgling Fraternity
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

* 1=Pew 1|Harold Masked
* 2=Pew 2|Giorgios Masked
* 3=Pew 3
* 4=Pew 4|Yusuf Masked
* 5=Pew 5|Giovanni Masked
* 6=Pew 6
* 7=Pew 7|Hugo Masked
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

## Niccolo Masked
* faceImage=pigMask.png
* title=Niccolò il Calabrese
* description=The same person we saw earlier - just with a mask on.

## Harold Masked
* faceImage=goatMask.png
* title=Harold of Norwich
* description=The same person we saw much earlier - just with a mask on.
* orientation=sitting
* items=Goat Mask
* facing=right

## Hugo Masked
* faceImage=horseMask.png
* title=Hugo of Speyer
* description=The same person we saw much earlier - just with a mask on.
* items=Horse Mask
* orientation=sitting
* facing=right

## Giorgios Masked
* faceImage=bullMask.png
* title=Giorgios tou Nikolaou
* description=The same person we saw much earlier - just with a mask on.
* items=Bull Mask
* orientation=sitting
* facing=right

## Yusuf Masked
* faceImage=rabbitMask.png
* title=Yusuf ibn Khalaf al-Balarmi
* description=The same person we saw much earlier - just with a mask on.
* orientation=sitting
* items=Rabbit Mask
* facing=right

## Giovanni Masked
* faceImage=stagMask.png
* title=Giovanni di Leone di Monreale
* description=The same person we saw much earlier - just with a mask on.
* items=Stag Mask
* orientation=sitting
* facing=right

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
: becomes Niccolo Masked
: Sticky Agatha says, "I'll stay here and keep watch."

(Niccolo enters Nave, and everybody turns to look at him)
22:59:48 Harold Masked faces left
: Giovanni Masked faces left
: Hugo Masked faces left
: Yusuf Masked faces left
: Giorgios Masked faces left

22:59:50 Harold Masked faces right
22:59:51 Giorgios Masked faces right
: Giovanni Masked faces right
22:59:52 Niccolo Masked @ Nave.80%
: faces left
: Yusuf Masked faces right
: Hugo Masked faces right
: Niccolo Masked says, "Friends, welcome!"
: says, "We are bound together by our anger."
: says, "We come together, in secret..."
: says, "To solve a common problem."
: Hugo Masked says, "That's right."
: Harold Masked says, "Uh huh."
: Niccolo Masked says, "Do you want dignity and respect?"
: Yusuf Masked says, "Yes!"
: Niccolo Masked says, "Do you want to earn fair pay for your labor?"
: Giovanni Masked says, "Oh yeah!"
: Giorgios Masked says, "Yes! Yes!"
: Niccolo Masked says, "And do you want..."
: says "the highest standards of craftsmanship to be upheld?"
: Yusuf Masked says, "Uh... sure."
: Giovanni Masked says, "Brother, your words touch my heart."
: says, "To cut a rock..."
: says, "To shape a rock..."
: says, "You must think like a rock!"
: Niccolo Masked says, "Truly, we must all know our craft."
: says, "That is our strength!"
: Giorgios Masked says, "Carving fine details in stone is hard."
: says, "Wine should flow freely throughout the day!"
: Niccolo Masked says, "We should work in comfortable conditions."
: says, "Yes, brother."
: Yusuf Masked says, "The right names need to be on the right lists!"
: Niccolo Masked says, "We need ways to verify who is one of us."
: says, "Lists, perhaps, though..."
: says, "secret handshakes and symbols are good too."
: Harold Masked says, "And if some massive jerk takes your job..."
: says, "because he did one convenient thing for King Frederick..."
: says, "REVENGE IS IN ORDER!"
: Niccolo Masked says, "Uh..."
: says, "Jobs should be given based on ability to do them well."
: says, "Not as personal favors."
: Hugo Masked says, "We should strive to rise from..."
: says "our precarious status and claim wealth..."
: says "in proportion to what we contribute to society."
: Niccolo Masked says, "Well said, brother! So glad you came."
: Yusuf Masked says, "These masks are really hot and itchy."
: Giorgios Masked says, "And I already know at least half of you."
: Yusuf Masked says, "Can we just take off the masks?"
: Niccolo Masked says, "Fine. But then we have to..."
: says, "go into the crypt to avoid being seen."
: Giorgios Masked takes Big Wineskin

23:01:55 Yusuf Masked @ Hall
: becomes Yusuf
: stands
: drops Rabbit Mask
23:01:56 Giovanni Masked @ Hall
: becomes Giovanni
: stands
: drops Stag Mask
23:01:57 Harold Masked @ Hall
: becomes Harold
: stands
: drops Goat Mask
23:01:58 Giorgios Masked @ Hall
: becomes Giorgios
: stands
: drops Bull Mask
23:01:59 Hugo Masked @ Hall
: stands
: says, "I... don't want to take off my mask."
: Yusuf says, "Why?"
: Hugo Masked says, "I don't trust everyone here yet."
: Yusuf says, "Understandable."
: Yusuf says, "I work with everyone here except you and..."
: says, "this guy." to Harold.
: Harold says, "I'm Harold."

23:02:06 Niccolo Masked @ Hall
: becomes Niccolo
: drops Pig Mask

# Conclusions

## Costumes

* conclusion=[Niccolò il Calabrese] disguised themself as a pig.
* revealRooms=Hall

## One More

* conclusion=[Sticky Agatha] donned no disguise at all.