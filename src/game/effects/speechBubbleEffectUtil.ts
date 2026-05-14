import Effect from "./types/Effect";
import EffectType from "./types/EffectType";
import SpeechBubbleEffect from "./types/SpeechBubbleEffect";
import Character from "../types/Character";
import ScalingFactors from "../types/ScalingFactors";
import { drawSpeechBubble, getCharacterSpeechAnchor } from "../characterDrawUtil";

function _onProcessLevelEffect(effect:Effect, context:CanvasRenderingContext2D):boolean {
  const speechBubbleEffect = effect as SpeechBubbleEffect;
  const { anchorX, anchorTopY } = getCharacterSpeechAnchor(
    speechBubbleEffect.character,
    speechBubbleEffect.scalingFactors,
    speechBubbleEffect.gameTime
  );
  drawSpeechBubble(speechBubbleEffect.speech, anchorX, anchorTopY, speechBubbleEffect.scalingFactors, context);
  return false;
}

export function createSpeechBubbleEffect(character:Character, speech:string, scalingFactors:ScalingFactors, gameTime:number):SpeechBubbleEffect {
  return {
    type:EffectType.SPEECH_BUBBLE,
    character,
    speech,
    scalingFactors,
    gameTime,
    startTime:Date.now(),
    onProcessLevelEffect:_onProcessLevelEffect
  };
}