# General

* title=The Fledgling Fraternity
* activeCharacter=Niccolo
* time:22:59:30
* background=nightSky.png
* groundFloorRoom=Forest
* imports=items.md | characters.md | roomStyles.md

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

```
....
.U..
....
```

* U=Ugolino

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
: faces left
: Yusuf faces right
: Hugo faces right
: Niccolo says, "Friends, welcome!"
: says, "We are bound together by our anger."
: says, "We come together, in secret..."
: says, "To solve a common problem."
: Hugo says, "That's right."
: Harold says, "Uh huh."
: Niccolo says, "Do you want dignity and respect?"
: Yusuf says, "Yes!"
: Niccolo says, "Do you want to earn fair pay for your labor?"
: Giovanni says, "Oh yeah!"
: Giorgios says, "Yes! Yes!"
: Niccolo says, "And do you want..."
: says "the highest standards of craftsmanship to be upheld?"
: Yusuf says, "Uh... sure."
: Giovanni says, "Brother, your words touch my heart."
: says, "To cut a rock..."
: says, "To shape a rock..."
: says, "You must think like a rock!"
: Niccolo says, "Truly, we must all know our craft."
: says, "That is our strength!"
: Giorgios says, "Carving fine details in stone is hard."
: says, "Wine should flow freely throughout the day!"
: Niccolo says, "We should work in comfortable conditions."
: says, "Yes, brother."
: Yusuf says, "The right names need to be on the right lists!"
: Niccolo says, "We need ways to verify who is one of us."
: says, "Lists, perhaps, though..."
: says, "secret handshakes are good too."
: Harold says, "And if some massive jerk takes your job..."
: says, "because he did one convenient thing for King Frederick..."
: says, "REVENGE IS IN ORDER!"
: Niccolo says, "Uh..."
: says, "Jobs should be given based on ability to do them well."
: says, "Not as personal favors."
: Hugo says, "We should strive to rise from..."
: says "our precarious status and claim wealth..."
: says "in proportion to what we contribute to society."
: Niccolo says, "Well said, brother! So glad you came."
: Yusuf says, "These masks are really hot and itchy."
: Giorgios says, "And I already know at least half of you."
: Yusuf says, "Can we just take off the masks?"
: Niccolo says, "Fine. But then we have to..."
: says, "go into the crypt to avoid being seen."
: Giorgios takes Big Wineskin

23:01:52 Yusuf goes to Hall (60%)
23:01:52 Giovanni goes to Hall (40%)
23:01:52 Harold goes to Hall (80%)
23:01:54 Giorgios goes to Hall (70%)
23:01:56 Hugo goes to Hall (30%)
23:02:13 Niccolo goes to Hall (20%)

23:01:55 Yusuf @ Hall
: appears default
: drops Rabbit Mask
23:01:56 Giovanni @ Hall
: appears default
: drops Stag Mask
: faces left
23:01:57 Harold @ Hall (80%)
: appears default
: drops Goat Mask
: faces left
23:01:58 Giorgios @ Hall (70%)
: appears default
: drops Bull Mask
: faces left
23:01:59 Hugo @ Hall (30%)
: says, "I... don't want to take off my mask."
: Yusuf says, "Why?" to Hugo
: Hugo says, "I don't trust everyone here yet."
: Yusuf says, "Understandable."
: Yusuf says, "I work with everyone here except you and..."
: says, "this guy." to Harold.
: Giorgios faces Harold
: Giovanni faces Harold
: Harold says, "I'm Harold."
23:02:15 Niccolo @ Hall (20%)
: appears default
: drops Pig Mask

23:02:16 Niccolo goes to Crypt (10%)
23:02:17 Yusuf goes to Crypt (20%)
23:02:19 Giorgios goes to Crypt (90%)
23:02:21 Harold goes to Crypt (40%)
23:02:21 Giovanni goes to Crypt (50%)
23:02:21 Hugo goes to Crypt (70%)

23:02:26 Niccolo @ Crypt (10%)
: faces right
23:02:26 Giorgios @ Crypt (90%)
23:02:27 Yusuf @ Crypt (20%)
23:02:28 Harold @ Crypt (40%)
23:02:29 Giovanni @ Crypt (50%)
23:02:30 Hugo @ Crypt (70%)
: says, "Fellow Freemasons, what is our next plan?"
: says "I am ready to do my part!"
: Niccolo says, "Freemasons? We're not freemasons."
: Hugo says, "You're not?"
: Niccolo says, "We haven't even picked a name yet."
: Hugo says, "My apologies!"
: says, "I'm at the wrong meeting."
: Hugo goes to Sacristan's Quarters (70%)
23:02:50 Niccolo says, "They've just been using that fake name to rile people up." 
: says "There are no freemasons."
: Yusuf says, "But what if..." to Niccolo
: says "we *were* the Freemasons?"
: Niccolo says, "I don't understand."
: Yusuf says, "The pope knows the Freemasons aren't real."
: says, "If we choose the same name for ourselves..."
: Niccolo says, "Our actions will blend in with the rumors he himself started."
: Yusuf says, "It gives us cover!"
: Harold says, "So I'm a Freemason now?"
: Niccolo says, "Yes! Oh, but actually..."
: says, "you're more a... Freeherald, I guess."
: Harold says, "It's a separate organization?"
: Niccolo says, "Yes, though closely allied with the Freemasons."
: Harold says, "Sounds good."
23:02:28 Giorgios goes (60%)

23:02:55 Hugo @ Sacristan's Quarters (70%)
: Hugo says, "My apologies, Father."
: says, "They are not Freemasons."
: Ugolino says, "I told you - the Freemasons are a fiction!"
: says, "Be done with your foolishness,"
: says, "and return to the Lateran Palace."
: Hugo says, "Yes, Father."
: goes to Forest (10%)
: hide Hugo


# Conclusions

* characters=Ahmad ibn Faraj al-Balarmi | Giorgios tou Nikolaou | Giovanni di Leone di Monreale | Gualtiero of Masala | Harold of Norwich | Hugo of Speyer | Matteo il Toro | Niccolò il Calabrese | Pietro di Ruggero di Palermo | Raniero de Stefano | Salomone ben David di Palermo | Stefan of Ragusa | Sticky Agatha | Ugolino di Conti | Yusuf ibn Khalaf al-Balarmi

## Costumes

* conclusion=[Niccolò il Calabrese] disguised themself as a pig.
* revealRooms=Hall

## One More

* conclusion=[Sticky Agatha] donned no disguise at all.