/* This module dispatches effects drawn as overlays after the complete level scene.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import EffectDrawCall from "../effects/types/EffectDrawCall";
import Effect from "../effects/types/Effect";
import LevelEffectDrawContext from "../effects/types/LevelEffectDrawContext";
import CharacterWithEffects from "../types/CharacterWithEffects";
import ScalingFactors from "../types/ScalingFactors";

export function handleAfterLevelDrawEffects(characters:CharacterWithEffects[], metaTimeEffects:Effect[],
    scalingFactors:ScalingFactors, gameTime:number, levelContext:LevelEffectDrawContext, metaTime:number,
    context:CanvasRenderingContext2D):void {
  const drawCall:EffectDrawCall = { stage:'afterLevel', levelContext };

  // Dispatch immutable timeline effects first.
  characters.forEach(character => {
    character.effects.forEach(effect => {
      if (effect.handler) effect.handler(drawCall, scalingFactors, gameTime, metaTime, context);
    });
  });

  // Dispatch active meta-time effects in collection order.
  metaTimeEffects.forEach(effect => {
    if (effect.handler) effect.handler(drawCall, scalingFactors, gameTime, metaTime, context);
  });
}