/* This module groups thought-bubble effect creation helpers for visible thought overlays.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { drawThoughtBubble, getCharacterSpeechAnchor } from "../drawing/characterDrawUtil";
import Character from "../types/Character";
import Position from "../types/Position";
import ScalingFactors from "../types/ScalingFactors";
import Effect from "./types/Effect";
import EffectType from "./types/EffectType";
import ThoughtBubbleEffect from "./types/ThoughtBubbleEffect";

function _onProcessLevelEffect(effect:Effect, context:CanvasRenderingContext2D):boolean {
  const thoughtBubbleEffect = effect as ThoughtBubbleEffect;
  const { anchorX, anchorTopY } = getCharacterSpeechAnchor(
    { ...thoughtBubbleEffect.character, position:thoughtBubbleEffect.displayPosition },
    thoughtBubbleEffect.scalingFactors,
    thoughtBubbleEffect.gameTime
  );
  drawThoughtBubble(thoughtBubbleEffect.thought, anchorX, anchorTopY, thoughtBubbleEffect.scalingFactors, context);
  return false;
}

export function createThoughtBubbleEffect(character:Character, displayPosition:Position, thought:string, scalingFactors:ScalingFactors, gameTime:number):ThoughtBubbleEffect {
  return {
    type:EffectType.THOUGHT_BUBBLE,
    character,
    displayPosition:{ ...displayPosition },
    thought,
    scalingFactors,
    gameTime,
    startTime:Date.now(),
    onProcessLevelEffect:_onProcessLevelEffect
  };
}
