# templates

## item

* prompt=Generate image of an [item] using the same STYLE as image #1. Limit detail so that the output image can be used as a tiny sprite. Don't create jagged edges on lines. Background should be fully transparent pixels.
* image1=item.png
* size=1024x1024

## character

* prompt=Generate image of a Medieval [occupation] using the same STYLE as image #1. The character should face right and have a neutral expression. Arms are slightly bent, hands held loosely open.{ The character is wearing [wearing].}{ Hair is [hair].}{ Skin is [skin].}{ [otherDetails].} Background should be fully transparent pixels.
* image1=medievalFigure.png
* size=1024x1024

## character-split

* prompt=Split image #1 into separate parts that can be used as assets for an animation rig - head, torso, left arm, right arm, left leg, right leg. Each part should be fully separated from the others and background should be transparent pixels.
* image1=lastGen.png
* size=1024x1024

## character-body

* prompt=Using image #1 as a basis, remove the head, arms, and legs from the image. A neck should remain when removing the head. The arms should be removed from the shoulders, with clothing from the body wrapping around the shoulders. The remaining body should be close in appearance to the original image. Background should be fully transparent pixels.
* image1=lastGen.png
* size=1024x1024

## male-head
* prompt=Generate head of a Medieval [occupation] using the same STYLE as image #1. The head should face right and have a neutral expression. Gender is male.{ Hair is [hair].}{ Skin is [skin].}{ [age] years old.}{ [otherDetails].} Do not include a neck. Low detail to support displaying at small scale. Background should be fully transparent pixels.
* image1=malePeasant.png
* size=1024x1024

## female-head
* prompt=Generate head of a Medieval [occupation] using the same STYLE as image #1. The head should face right and have a neutral expression. Gender is female.{ Hair is [hair].}{ Skin is [skin].}{ [age] years old.}{ [otherDetails].} Do not include a neck. Low detail to support displaying at small scale. Background should be fully transparent pixels.
* image1=constanceI.png
* size=1024x1024

## character-faces

* prompt=Using image #1 as a basis, make copies of the head expressing each of the following emotions - neutral, angry, sad, happy, confused, afraid. Neutral should be close to the original expression from image #1. The other emotions should be exaggerated and easily recognizable. Mouth should be slightly open on all faces. Head should not include the neck. Each head should be fully separated from the others. Background should be fully transparent pixels.
* image1=lastGen.png
* size=1024x1024