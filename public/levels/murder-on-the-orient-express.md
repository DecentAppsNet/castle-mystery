# general

* title=Murder on the Orient Express
* activeCharacter=Pierre Michel
* time=19:30
* winSynopsis=Murder on the Orient Express

# map

```
112233445566778899aabbccdd..........
112233445566778899aabbccdd..........
CCCCCCCCCCCCCCCCCCCCCCCCCCRRRRRRRRRR
..........................RRRRRRRRRR
```

* 1=Compartment 1
* 2=Compartment 2
* 3=Compartment 3
* 4=Compartment 4
* 5=Compartment 5
* 6=Compartment 6
* 7=Compartment 7
* 8=Compartment 8
* 9=Compartment 9
* a=Compartment 10
* b=Compartment 11
* c=Compartment 12
* d=Compartment 13
* C=Corridor
* R=Restaurant Car

# rooms

## Compartment 1

* exits=Corridor

## Compartment 2

* exits=Corridor

```
....
.V..
....
....
```

* V=Ratchett

## Compartment 3

* exits=Corridor

```
....
.M..
....
....
```

* M=MacQueen

## Compartment 4

* exits=Corridor

```
....
.E..
....
....
```

* E=Masterman

## Compartment 5

* exits=Corridor

```
....
.F..
....
....
```

* F=Foscarelli

## Compartment 6

* exits=Corridor

```
....
.HA.
....
....
```

* H=Helena
* A=Rudolph

## Compartment 7

* exits=Corridor

```
....
.D..
....
....
```

* D=Mary

## Compartment 8

* exits=Corridor

## Compartment 9

* exits=Corridor

```
....
.X..
....
....
```

* X=Arbuthnot

## Compartment 10

* exits=Corridor

```
....
.B..
....
....
```

* B=Hubbard

## Compartment 11

* exits=Corridor

```
....
.G..
....
....
```

* G=Greta

## Compartment 12

* exits=Corridor

```
....
.S..
....
....
```

* S=Schmidt

## Compartment 13

* exits=Corridor

```
....
.P..
....
....
```

* P=Princess

## Corridor

* exits=Compartment 1|Compartment 2|Compartment 3|Compartment 4|Compartment 5|Compartment 6|Compartment 7|Compartment 8|Compartment 9|Compartment 10|Compartment 11|Compartment 12|Compartment 13|Restaurant Car

```
PE........................
```

* P=Pierre Michel
* E=End

## Restaurant Car

* exits=Corridor

# characters

## Pierre Michel

* description=A tall Frenchman in the dark-blue uniform of the Wagons-Lits conductor. Trim moustache, watchful eyes; he knows every passenger by berth number.
* items=Master Key|Conductor's Logbook
* faceImage=/sprites/pierreFace.png
* isTitleKnown=false

## Ratchett

* title=Samuel Ratchett
* description=An elderly American gentleman, thin-lipped and uneasy. He travels with an outsized chequebook and a markedly smaller list of friends.
* faceImage=/sprites/ratchettFace.png
* isTitleKnown=false

## MacQueen

* title=Hector MacQueen
* description=A tall young American in a worn tweed jacket, secretary to Mr Ratchett, with a silver flask he never lets out of reach.
* items=Silver Flask
* faceImage=/sprites/macqueenFace.png
* isTitleKnown=false

## Masterman

* title=Edward Masterman
* description=A clipped English valet in pressed black. Eyes lowered, hands always behind his back; a small glass vial sits in his waistcoat pocket.
* items=Glass Vial
* faceImage=/sprites/mastermanFace.png
* isTitleKnown=false

## Foscarelli

* title=Antonio Foscarelli
* description=A boisterous Italian-American car salesman; big laugh, bigger hands, never far from a cigarette.
* faceImage=/sprites/foscarelliFace.png
* isTitleKnown=false

## Helena

* title=Countess Helena Andrenyi
* description=A pale, elegant Hungarian countess with sad dark eyes. She rarely speaks above a murmur, even when spoken to.
* faceImage=/sprites/helenaAndrenyiFace.png
* isTitleKnown=false

## Rudolph

* title=Count Rudolph Andrenyi
* description=A stern Hungarian diplomat whose courtly manners thaw only when his wife is in danger of being approached.
* faceImage=/sprites/rudolphAndrenyiFace.png
* isTitleKnown=false

## Mary

* title=Mary Debenham
* description=A composed young Englishwoman with the bearing of a governess. She carries a small embroidered reticule everywhere she goes.
* items=Reticule
* faceImage=/sprites/debenhamFace.png
* isTitleKnown=false

## Arbuthnot

* title=Colonel Arbuthnot
* description=A weathered British officer of the Indian Army; pipe in hand, pipe-cleaners in pocket, opinions on everything from horses to politics.
* items=Pipe|Pipe Cleaners
* faceImage=/sprites/arbuthnotFace.png
* isTitleKnown=false

## Hubbard

* title=Mrs Caroline Hubbard
* description=A loud, friendly American woman with endless stories about her daughter. Her chintz sponge-bag is never far from her hand.
* items=Sponge-Bag
* faceImage=/sprites/hubbardFace.png
* isTitleKnown=false

## Greta

* title=Greta Ohlsson
* description=A devout Swedish nurse with a tired smile, a small bible in one pocket and a phial of holy oil in the other.
* items=Small Bible|Holy Oil Phial
* faceImage=/sprites/ohlssonFace.png
* isTitleKnown=false

## Schmidt

* title=Hildegarde Schmidt
* description=The Princess's German lady's maid: calm, capable, with a sewing kit at the ready for any popped seam.
* items=Sewing Kit
* faceImage=/sprites/schmidtFace.png
* isTitleKnown=false

## Princess

* title=Princess Dragomiroff
* description=An aged Russian aristocrat in heavy black silks. She walks with a silver-topped cane and tolerates very few foolish questions.
* items=Walking Cane|Russian Newspaper
* faceImage=/sprites/dragomiroffFace.png
* isTitleKnown=false

# items

## Master Key

* description=A heavy brass passkey on a worn leather lanyard. Opens every passenger compartment on the train.
* displayChar=⚷

## Conductor's Logbook

* description=Pierre Michel's small leather notebook. Entries in neat French record passenger names, berths, and the punctuality of every halt.
* displayChar=▤

## Silver Flask

* description=An engraved silver flask, dented and well-loved. Smells faintly of cognac and, beneath that, something bitter.
* displayChar=⚱

## Glass Vial

* description=A slim glass phial, half-full of a clear liquid. The stopper is wax-sealed.
* displayChar=⚗

## Reticule

* description=A small embroidered drawstring bag belonging to Mary Debenham. Inside, a creased photograph of a child labelled "Daisy".
* displayChar=⌸

## Pipe

* description=Colonel Arbuthnot's briar pipe, bowl scorched dark with use.
* displayChar=⌇

## Pipe Cleaners

* description=A small bundle of white pipe-cleaners. Standard cavalry-officer issue, slightly used.
* displayChar=⌁

## Sponge-Bag

* description=Mrs Hubbard's chintz-patterned toilet bag, larger than it looks. Usually hangs from the door-handle of whichever compartment she occupies.
* displayChar=⊞

## Small Bible

* description=A pocket bible bound in worn green cloth. The ribbon marks Psalm 23.
* displayChar=✚

## Holy Oil Phial

* description=A tiny corked phial of olive oil, blessed at Uppsala for the comfort of the sick.
* displayChar=⏚

## Sewing Kit

* description=A neat tin case holding needles, threads in six shades, and a small pair of scissors.
* displayChar=✂

## Walking Cane

* description=A silver-topped ebony cane. The Princess does not, in fact, need it to walk.
* displayChar=Ⅰ

## Russian Newspaper

* description=A folded copy of "Russkiye Vedomosti" from the previous week. Heavy creases at the editorial section.
* displayChar=▦

# itinerary

# solutions
