/*
  }
        // TODO call some function that returns consolidated sprite overrides from calls to handlers, and pass to drawCharacter().
        drawCharacter(content.character, content.displayPosition, scalingFactors, context, gameTime, imageSet,
          content.character.id === activeCharacter.id || content.character.id === hoveredCharacterId, metaTime);

        { // TODO cleanup/refactor to a function after this stabilizes.
          const { anchorX, anchorTopY } = getCharacterSpeechAnchor(
            content.character, content.displayPosition, scalingFactors, gameTime);
          const characterContext:CharacterEffectDrawContext = { anchorX, anchorTopY };
          const afterCharacterDrawCall:EffectDrawCall = { stage:'afterCharacter', characterContext };
          content.character.effects.forEach(e => { 
            if (e.handler) e.handler(afterCharacterDrawCall, scalingFactors, gameTime, metaTime, context);
          });
        }
        return;
        */

import CharacterEffectDrawContext from "@/game/effects/types/CharacterEffectDrawContext";
import Effect from "@/game/effects/types/Effect";
import EffectDrawCall from "@/game/effects/types/EffectDrawCall";
import SpriteOverride from "@/game/effects/types/SpriteOverride";
import ScalingFactors from "@/game/types/ScalingFactors";

const NO_OVERRIDES:SpriteOverride[] = []; // Avoid repeated allocations for trivial return logic.

// Specialized effect handler calling for the beforeCharacter draw stage. Coupled to this knowledge:
// * none of the before-character-draw handlers use metaTime
// * some of them will return sprite overrides
// This function can potentially be called hundreds of times in one animation frame. Avoid introducing performance issues.
export function handleBeforeCharacterDrawEffects(effects:Effect[], scalingFactors:ScalingFactors, gameTime:number, 
    characterContext:CharacterEffectDrawContext, canvasContext:CanvasRenderingContext2D):SpriteOverride[] {
  if (effects.length === 0) return NO_OVERRIDES;
  const spriteOverrides:SpriteOverride[] = [];
  const drawCall:EffectDrawCall = { stage:'beforeCharacter', characterContext };
  effects.forEach(effect => {
    if (!effect.handler) return; // TODO after you've implemented all the handlers, consider if null handlers are still a valid case and tighten the type if not.
    const result = effect.handler(drawCall, scalingFactors, gameTime, -1 /* unused */, canvasContext);
    if (result) spriteOverrides.push(...result.spriteOverrides);
  });
  return spriteOverrides;
}

// Specialized effect handler calling for the afterCharacter draw stage. Coupled to this knowledge:
// * none of the after-character-draw handlers use metaTime
// * none of them will return sprite overrides (sprite overrides are only useful to have *before* the character is drawn)
// This function can potentially be called hundreds of times in one animation frame. Avoid introducing performance issues.
export function handleAfterCharacterDrawEffects(effects:Effect[], scalingFactors:ScalingFactors, gameTime:number, 
    characterContext:CharacterEffectDrawContext, canvasContext:CanvasRenderingContext2D):void {
  if (effects.length === 0) return; 
  const drawCall:EffectDrawCall = { stage:'afterCharacter', characterContext };
  effects.forEach(effect => {
    if (effect.handler) effect.handler(drawCall, scalingFactors, gameTime, -1 /* unused */, canvasContext);
  });
}