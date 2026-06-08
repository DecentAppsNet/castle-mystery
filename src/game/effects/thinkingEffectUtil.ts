/* This module groups thinking-effect creation and head-angle helpers for thought animation.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import Character from "@/game/types/Character";
import Effect from "./types/Effect";
import EffectType from "./types/EffectType";
import ThinkingEffect from "./types/ThinkingEffect";

export const THINKING_ANGLE_RADIANS = Math.PI / 12;
export const THINKING_LOOK_DOWN_DURATION_MSECS = 200;
export const THINKING_LOOK_UP_DURATION_MSECS = 200;

function _onProcessLevelEffect(effect:Effect, _context:CanvasRenderingContext2D):boolean {
  const thinkingEffect = effect as ThinkingEffect;
  return thinkingEffect.gameTime < thinkingEffect.thoughtEndTime + THINKING_LOOK_UP_DURATION_MSECS;
}

export function createThinkingEffect(character:Character, thoughtStartTime:number, thoughtEndTime:number, gameTime:number):ThinkingEffect {
  return {
    type:EffectType.THINKING,
    character,
    thoughtStartTime,
    thoughtEndTime,
    gameTime,
    startTime:Date.now(),
    onProcessLevelEffect:_onProcessLevelEffect
  };
}

export function calcThinkingAngleOffsetRadians(thinkingEffect:ThinkingEffect, gameTime:number):number {
  if (gameTime < thinkingEffect.thoughtStartTime) return 0;
  if (gameTime >= thinkingEffect.thoughtEndTime + THINKING_LOOK_UP_DURATION_MSECS) return 0;

  const lookDownElapsedTime = gameTime - thinkingEffect.thoughtStartTime;
  const lookDownProgress = Math.min(1, lookDownElapsedTime / THINKING_LOOK_DOWN_DURATION_MSECS);
  const peakAngleOffsetRadians = THINKING_ANGLE_RADIANS * lookDownProgress;
  if (gameTime < thinkingEffect.thoughtEndTime) return peakAngleOffsetRadians;

  const lookUpElapsedTime = gameTime - thinkingEffect.thoughtEndTime;
  return peakAngleOffsetRadians * (1 - lookUpElapsedTime / THINKING_LOOK_UP_DURATION_MSECS);
}