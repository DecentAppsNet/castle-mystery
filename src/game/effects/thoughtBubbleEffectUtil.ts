import { drawThoughtBubble, getCharacterSpeechAnchor } from "../drawing/characterDrawUtil";
import Character from "../types/Character";
import ScalingFactors from "../types/ScalingFactors";
import Effect from "./types/Effect";
import EffectType from "./types/EffectType";
import ThoughtBubbleEffect from "./types/ThoughtBubbleEffect";

function _onProcessLevelEffect(effect:Effect, context:CanvasRenderingContext2D):boolean {
  const thoughtBubbleEffect = effect as ThoughtBubbleEffect;
  const { anchorX, anchorTopY } = getCharacterSpeechAnchor(
    thoughtBubbleEffect.character,
    thoughtBubbleEffect.scalingFactors,
    thoughtBubbleEffect.gameTime
  );
  drawThoughtBubble(thoughtBubbleEffect.thought, anchorX, anchorTopY, thoughtBubbleEffect.scalingFactors, context);
  return false;
}

export function createThoughtBubbleEffect(character:Character, thought:string, scalingFactors:ScalingFactors, gameTime:number):ThoughtBubbleEffect {
  return {
    type:EffectType.THOUGHT_BUBBLE,
    character,
    thought,
    scalingFactors,
    gameTime,
    startTime:Date.now(),
    onProcessLevelEffect:_onProcessLevelEffect
  };
}
