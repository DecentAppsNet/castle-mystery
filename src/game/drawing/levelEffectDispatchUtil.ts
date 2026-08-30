/* This module dispatches character-owned effects drawn as overlays after the complete level scene.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import EffectDrawCall from "../effects/types/EffectDrawCall";
import { isPositionInRect } from "../rectUtil";
import CharacterWithEffects from "../types/CharacterWithEffects";
import Room from "../types/Room";
import ScalingFactors from "../types/ScalingFactors";
import { projectRoomPointWithDepth } from "./roomPanelProjectionUtil";

export function handleAfterLevelDrawEffects(characters:CharacterWithEffects[], activeRoom:Room,
    isLevelComplete:boolean, scalingFactors:ScalingFactors, gameTime:number, metaTime:number,
    context:CanvasRenderingContext2D):void {
  const activeRoomTopCenterCanvasPoint = projectRoomPointWithDepth(
    activeRoom.rect.x + activeRoom.rect.width / 2,
    activeRoom.rect.y,
    0,
    scalingFactors
  );
  characters.forEach(character => {
    if (character.effects.length === 0) return;
    const drawCall:EffectDrawCall = {
      stage:'afterLevel',
      levelContext:{
        isEffectCharacterInActiveRoom:isPositionInRect(character.position.x, character.position.y, activeRoom.rect),
        isLevelComplete,
        activeRoomTopCenterCanvasPoint
      }
    };
    character.effects.forEach(effect => {
      if (effect.handler) effect.handler(drawCall, scalingFactors, gameTime, metaTime, context);
    });
  });
}