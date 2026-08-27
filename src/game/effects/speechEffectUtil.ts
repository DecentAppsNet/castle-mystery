import { drawSpeechBubble } from "../drawing/characterDrawUtil";
import Position from "../types/Position";
import ScalingFactors from "../types/ScalingFactors";
import Effect from "./types/Effect";
import EffectDrawStage from "./types/EffectDrawStage";
import { EffectHandlerResult } from "./types/EffectHandler";

function _calcAnchorForCharacterPosition(characterPosition:Position):{ anchorX:number, anchorTopY:number } {
  // TODO - refine
  const anchorX = characterPosition.x;
  const anchorTopY = characterPosition.y;
  return { anchorX, anchorTopY };
}

function _saysHandler(drawStage:EffectDrawStage, scalingFactors:ScalingFactors, time:number, context:CanvasRenderingContext2D,
  anchorX:number, anchorTopY:number, text:string, startTime:number):EffectHandlerResult|null {

    if (drawStage !== 'afterCharacter') return null; // TODO - head rotation

    drawSpeechBubble(text, anchorX, anchorTopY, scalingFactors, context, startTime, time);
    return null;
}

export function createSaysEffect(characterPosition:Position, text:string, startTime:number, speechDuration:number):Effect {
  const { anchorX, anchorTopY } = _calcAnchorForCharacterPosition(characterPosition);
  const handler = (drawStage:EffectDrawStage, scalingFactors:ScalingFactors, time:number, _metaTime:number, context:CanvasRenderingContext2D) => {
    return _saysHandler(drawStage, scalingFactors, time, context, anchorX, anchorTopY, text, startTime);
  }
  return { kind:'says', startTime, endTime:startTime+speechDuration, handler };
}

/*

export function drawSpeechBubble(speech:string, anchorX:number, anchorTopY:number,
  scalingFactors:ScalingFactors, context:CanvasRenderingContext2D, startTime:number, metaTime:number) {


  // scalingFactors:ScalingFactors, context:CanvasRenderingContext2D, startTime:number, metaTime:number - these are standard params of handler
  
  anchorX, anchorTopY - these can be determined when effect is created. And in the case of speech, they would stay constant because characters
  don't move while speaking. (design decision, not just a functionality limitation)

  head rotation is different. The character is already going to draw the head. And the head is a body part that has a draw order with other 
  character parts before and after. So if you were to use a handler to draw it with dependency injection, you'd need an injection site at the
  draw head point of execution and suppression of normal head drawing.

  The handler could return data, e.g.

  type SpriteOverride = {
    spriteKind:'leftHandItem'|'rightHandItem'|'head'
    transformType:'rotate'|'scale'|'translate'
    transformX:number,
    transformY:number,
    transformZ:number,
  }

  {
    spriteOverrides:SpriteOverride[]
  }

  So for the speech effect, we'd call the handler at beforeCharacter and afterCharacter draw stages. The beforeCharacter call would
  return spriteOverrides. As we draw the character, spriteOverrides are passed to all character-drawing code and applied to each part. Draw code
  need only support expected operations, e.g. If no effect scales a head, then don't write code to scale it.

  The beforeCharacter handler call wouldn't draw anything. The second call to same handler would be made at the afterCharacter injection site.
  This one would draw the speech bubble over the character's head.

*/