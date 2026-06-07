/* This module groups effect-processing helpers that dispatch active effects by room, character, and scene phase.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import Character from "../types/Character";
import ImageSet from "../types/ImageSet";
import Room from "../types/Room";
import ScalingFactors from "../types/ScalingFactors";
import Effect from "./types/Effect";

export function processLevelEffects(effects:Effect[], context:CanvasRenderingContext2D) {
  for (let i = effects.length - 1; i >= 0; --i) {
    const effect = effects[i];
    if (!effect.onProcessLevelEffect) continue;
    if (!effect.onProcessLevelEffect(effect, context)) effects.splice(i, 1);
  }
}

export function processRoomEffects(room:Room, effects:Effect[], context:CanvasRenderingContext2D,
  scalingFactors:ScalingFactors, canDrawEffect:boolean, imageSet:ImageSet) {
  for (let i = effects.length - 1; i >= 0; --i) {
    const effect = effects[i];
    if (!effect.onProcessRoomEffect || !effect.room || effect.room.id !== room.id) continue;
    if (room.isObscured) {
      effects.splice(i, 1);
      continue;
    }
    if (!effect.onProcessRoomEffect(room, effect, context, scalingFactors, canDrawEffect, imageSet)) effects.splice(i, 1);
  }
}

function _processCharacterEffects(character:Character, effects:Effect[], context:CanvasRenderingContext2D,
  scalingFactors:ScalingFactors, imageSet:ImageSet, drawsBefore:boolean) {
  for (let i = effects.length - 1; i >= 0; --i) {
    const effect = effects[i];
    if (!effect.onProcessCharacterEffect || !effect.character || effect.character.id !== character.id) continue;
    if (effect.drawsBefore !== drawsBefore) continue;
    if (!effect.onProcessCharacterEffect(character, effect, context, scalingFactors, imageSet)) effects.splice(i, 1);
  }
}

export function processBeforeCharacterEffects(character:Character, effects:Effect[], context:CanvasRenderingContext2D,
  scalingFactors:ScalingFactors, imageSet:ImageSet) {
  _processCharacterEffects(character, effects, context, scalingFactors, imageSet, true);
}

export function processAfterCharacterEffects(character:Character, effects:Effect[], context:CanvasRenderingContext2D,
  scalingFactors:ScalingFactors, imageSet:ImageSet) {
  _processCharacterEffects(character, effects, context, scalingFactors, imageSet, false);
}
