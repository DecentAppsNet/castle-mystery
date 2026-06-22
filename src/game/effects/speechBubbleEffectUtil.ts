/* This module groups speech-bubble effect creation helpers for audible dialogue overlays.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import Effect from "./types/Effect";
import EffectType from "./types/EffectType";
import SpeechBubbleEffect from "./types/SpeechBubbleEffect";
import Character from "../types/Character";
import Position from "../types/Position";
import ScalingFactors from "../types/ScalingFactors";
import { drawSpeechBubble, getCharacterSpeechAnchor } from "../drawing/characterDrawUtil";

function _onProcessLevelEffect(effect:Effect, context:CanvasRenderingContext2D):boolean {
  const speechBubbleEffect = effect as SpeechBubbleEffect;
  const { anchorX, anchorTopY } = getCharacterSpeechAnchor(
    { ...speechBubbleEffect.character, position:speechBubbleEffect.displayPosition },
    speechBubbleEffect.scalingFactors,
    speechBubbleEffect.gameTime
  );
  drawSpeechBubble(speechBubbleEffect.speech, anchorX, anchorTopY, speechBubbleEffect.scalingFactors, context);
  return false;
}

export function createSpeechBubbleEffect(character:Character, displayPosition:Position, speech:string, scalingFactors:ScalingFactors, gameTime:number):SpeechBubbleEffect {
  return {
    type:EffectType.SPEECH_BUBBLE,
    character,
    displayPosition:{ ...displayPosition },
    speech,
    scalingFactors,
    gameTime,
    startTime:Date.now(),
    onProcessLevelEffect:_onProcessLevelEffect
  };
}