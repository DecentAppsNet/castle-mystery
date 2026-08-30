/* This module dispatches effects drawn as overlays after the complete level scene.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import EffectDrawCall from "../effects/types/EffectDrawCall";
import LevelEffectDrawContext from "../effects/types/LevelEffectDrawContext";
import CharacterWithEffects from "../types/CharacterWithEffects";
import ScalingFactors from "../types/ScalingFactors";

export function handleAfterLevelDrawEffects(characters:CharacterWithEffects[], scalingFactors:ScalingFactors, gameTime:number,
    levelContext:LevelEffectDrawContext, metaTime:number, context:CanvasRenderingContext2D):void {
  const drawCall:EffectDrawCall = { stage:'afterLevel', levelContext };
  characters.forEach(character => {
    character.effects.forEach(effect => {
      if (effect.handler) effect.handler(drawCall, scalingFactors, gameTime, metaTime, context);
    });
  });
}