/* This file dispatches character-owned effects at stages before, after, and above character drawing.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import CharacterEffectDrawContext from "@/game/effects/types/CharacterEffectDrawContext";
import Effect from "@/game/effects/types/Effect";
import EffectDrawCall from "@/game/effects/types/EffectDrawCall";
import ScalingFactors from "@/game/types/ScalingFactors";
import CharacterEffectDrawEntry from "./types/CharacterEffectDrawEntry";

// Specialized effect handler calling for the beforeCharacter draw stage.
// This function can potentially be called hundreds of times in one animation frame. Avoid introducing performance issues.
export function handleBeforeCharacterDrawEffects(effects:Effect[], scalingFactors:ScalingFactors, gameTime:number, metaTime:number,
    characterContext:CharacterEffectDrawContext, canvasContext:CanvasRenderingContext2D):void {
  if (effects.length === 0) return;
  const drawCall:EffectDrawCall = { stage:'beforeCharacter', characterContext };
  effects.forEach(effect => {
    if (!effect.drawHandler) return;
    effect.drawHandler(drawCall, scalingFactors, gameTime, metaTime, canvasContext);
  });
}

// Specialized effect handler calling for the afterCharacter draw stage. Coupled to this knowledge:
// * none of the after-character-draw handlers use metaTime
// This function can potentially be called hundreds of times in one animation frame. Avoid introducing performance issues.
export function handleAfterCharacterDrawEffects(effects:Effect[], scalingFactors:ScalingFactors, gameTime:number, 
    characterContext:CharacterEffectDrawContext, canvasContext:CanvasRenderingContext2D):void {
  if (effects.length === 0) return; 
  const drawCall:EffectDrawCall = { stage:'afterCharacter', characterContext };
  effects.forEach(effect => {
    if (effect.drawHandler) effect.drawHandler(drawCall, scalingFactors, gameTime, -1 /* unused */, canvasContext);
  });
}

export function handleCharacterAfterLevelDrawEffects(entries:ReadonlyArray<CharacterEffectDrawEntry>,
  scalingFactors:ScalingFactors, gameTime:number, metaTime:number, canvasContext:CanvasRenderingContext2D):void {
  entries.forEach(({ character, characterContext }) => {
    const drawCall:EffectDrawCall = { stage:'characterAfterLevel', characterContext };
    character.effects.forEach(effect => {
      if (effect.drawHandler) effect.drawHandler(drawCall, scalingFactors, gameTime, metaTime, canvasContext);
    });
  });
}