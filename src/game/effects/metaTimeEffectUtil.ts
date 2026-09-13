/* This file manages the lifecycle of short-lived effects whose timing is based on meta-time.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import Effect from "./types/Effect";

/** Removes effects whose half-open meta-time lifetime has ended. */
export function removeExpiredMetaTimeEffects(effects:Effect[], metaTime:number):void {
  for (let effectI = effects.length - 1; effectI >= 0; --effectI) {
    if (effects[effectI].endTime <= metaTime) effects.splice(effectI, 1);
  }
}

/** Appends an effect for a character, creating that character's collection when needed. */
export function appendCharacterMetaTimeEffect(effectsByCharacterId:Map<string, Effect[]>, characterId:string, effect:Effect):void {
  const effects = effectsByCharacterId.get(characterId);
  if (effects) {
    effects.push(effect);
  } else {
    effectsByCharacterId.set(characterId, [effect]);
  }
}

/** Removes ended character effects and deletes character entries with no surviving effects. */
export function removeExpiredCharacterMetaTimeEffects(effectsByCharacterId:Map<string, Effect[]>, metaTime:number):void {
  effectsByCharacterId.forEach((effects, characterId) => {
    removeExpiredMetaTimeEffects(effects, metaTime);
    if (effects.length === 0) effectsByCharacterId.delete(characterId);
  });
}