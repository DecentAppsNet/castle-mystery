import Character from "../types/Character";
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
  scalingFactors:ScalingFactors, canDrawEffect:boolean) {
  for (let i = effects.length - 1; i >= 0; --i) {
    const effect = effects[i];
    if (!effect.onProcessRoomEffect || !effect.room || effect.room.id !== room.id) continue;
    if (room.isObscured) {
      effects.splice(i, 1);
      continue;
    }
    if (!effect.onProcessRoomEffect(room, effect, context, scalingFactors, canDrawEffect)) effects.splice(i, 1);
  }
}

function _processCharacterEffects(character:Character, effects:Effect[], context:CanvasRenderingContext2D,
  scalingFactors:ScalingFactors, drawsBefore:boolean) {
  for (let i = effects.length - 1; i >= 0; --i) {
    const effect = effects[i];
    if (!effect.onProcessCharacterEffect || !effect.character || effect.character.id !== character.id) continue;
    if (effect.drawsBefore !== drawsBefore) continue;
    if (!effect.onProcessCharacterEffect(character, effect, context, scalingFactors)) effects.splice(i, 1);
  }
}

export function processBeforeCharacterEffects(character:Character, effects:Effect[], context:CanvasRenderingContext2D,
  scalingFactors:ScalingFactors) {
  _processCharacterEffects(character, effects, context, scalingFactors, true);
}

export function processAfterCharacterEffects(character:Character, effects:Effect[], context:CanvasRenderingContext2D,
  scalingFactors:ScalingFactors) {
  _processCharacterEffects(character, effects, context, scalingFactors, false);
}
