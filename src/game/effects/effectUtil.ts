import Character from "../types/Character";
import Room from "../types/Room";
import Effect from "./types/Effect";

export function processLevelEffects(effects:Effect[], context:CanvasRenderingContext2D) {
  for (let i = effects.length - 1; i >= 0; --i) {
    const effect = effects[i];
    if (!effect.onProcessLevelEffect) continue;
    if (!effect.onProcessLevelEffect(effect, context)) effects.splice(i, 1);
  }
}

export function processRoomEffects(room:Room, effects:Effect[], context:CanvasRenderingContext2D, isActive:boolean) {
  for (let i = effects.length - 1; i >= 0; --i) {
    const effect = effects[i];
    if (!effect.onProcessRoomEffect || !effect.room || effect.room.id !== room.id) continue;
    if (room.isObscured) {
      effects.splice(i, 1);
      continue;
    }
    if (!effect.onProcessRoomEffect(room, effect, context, isActive)) effects.splice(i, 1);
  }
}

export function processCharacterEffects(character:Character, effects:Effect[], context:CanvasRenderingContext2D) {
  for (let i = effects.length - 1; i >= 0; --i) {
    const effect = effects[i];
    if (!effect.onProcessCharacterEffect || !effect.character || effect.character.id !== character.id) continue;
    if (!effect.onProcessCharacterEffect(character, effect, context)) effects.splice(i, 1);
  }
}
