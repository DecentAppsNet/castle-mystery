# General

* title=Three Blind Mice
* activeCharacter=Tobias
* time=18:00:00
* background=daySky.png
* winSynopsis=At autumn dusk on the upland farm, three half-blind mice raided the flour bin and lost their tails to the farmer's wife and her carving knife.

# Map

```
PPKKYYBB
```

* P=Pantry
* K=Kitchen
* Y=Yard
* B=Barn

# Rooms

## Pantry

```
..c.....
.T.P.M..
........
```

* T=Tobias
* P=Pip
* M=Marigold
* c=Cheese
* exits=Kitchen

## Kitchen

```
...g....
.....d..
........
```

* g=Grimalkin
* d=Dame Hartwell
* exits=Pantry | Yard

## Yard

```
....s...
........
........
```

* s=Silas Hartwell
* exits=Barn

## Barn

```
........
........
........
```

# Characters

## Tobias

* title=The Bold Mouse
* description=A small grey mouse with a singed whisker, walking straight at danger. A crumb of yellow cheese is tucked behind one ear. He keeps saying he is not afraid of her.
* faceImage=tobias.png

## Pip

* title=The Timid Mouse
* description=A trembling mouse that flinches and hides, trailing a half-chewed length of string. He whispers to stay low.
* faceImage=pip.png
* items=String

## Marigold

* title=The Clever Mouse

* description=A sharp-eyed mouse who senses the trap and counts the exits aloud. She carries a brass thimble.
* faceImage=marigold.png
* items=Brass Thimble

## Dame Hartwell

* title=The Farmer's Wife
* description=A broad woman in a floury apron, arms dusted white, furious. She mutters that they were in her flour bin again. A carving knife rides in her apron.
* faceImage=damehartwell.png
* items=Carving Knife

## Silas Hartwell

* title=The Farmer
* description=A weary, half-deaf old man who smells of pipe smoke. He keeps telling his wife to leave them be.
* faceImage=silashartwell.png

## Grimalkin

* title=The Cat
* description=A fat, indifferent cat who long ago blinded the mice. He says nothing, only purrs, and his claws are notched.
* faceImage=grimalkin.png

# Items

## Carving Knife

* description=A long, well-honed carving knife, kept in the apron pocket.
* image=carvingKnife.png

## Cheese

* description=A pale wheel of yellow cheese, the lure that drew the mice to the flour bin.
* image=cheese.png

## Brass Thimble

* description=A small brass thimble, dented from much use.
* image=brassThimble.png

## String

* description=A half-chewed length of string, frayed at both ends.
* image=string.png

# Itinerary

18:00:00 Marigold says, "Two doors, one window."
: Pip says, "Stay low, stay low."
: Tobias says, "I'm not afraid of her."
: takes Cheese in right hand
: drops Cheese (.4,-.6,0)
18:00:10 Dame Hartwell @ Pantry.40%
: says, "They were in my flour bin again!"
: Marigold says, "Two doors, one window."
: Pip says, "Stay low, stay low."
18:00:20 Tobias @ Kitchen.30%
: Pip @ Kitchen.40%
: Marigold @ Kitchen.50%
18:00:24 Dame Hartwell @ Kitchen.60%
: says, "Hold still, you thieves!"
: Tobias says, "I'm not afraid of her."
18:00:30 Silas Hartwell @ Kitchen.10%
: says, "Leave them be, woman."
: Grimalkin says, "(purrs)"
18:00:36 Tobias @ Yard.40%
: Pip @ Yard.50%
: Marigold @ Yard.60%
18:00:42 Tobias @ Barn.40%
: Pip @ Barn.50%
: Marigold @ Barn.60%

# Conclusions

* verbs=stole|hid|broke|cut|chased|blinded
* withObjects=a carving knife|her apron|the cheese|a brass thimble|the string

## Identities

* unlockConclusions=What Happened to the Tails?

## What Happened to the Tails?

* conclusion=[Dame Hartwell] [cut] off the mice's tails with [a carving knife] in the [Kitchen].
