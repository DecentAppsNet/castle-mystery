/* This module groups hand-held item drawing helpers, including per-hand layering and in-hand item metrics.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { calcItemCuboidHeightPixels, calcItemCuboidWidthPixels } from "@/game/itemSizeUtil";
import Effect from "@/game/effects/types/Effect";
import EffectType from "@/game/effects/types/EffectType";
import TakeItemEffect from "@/game/effects/types/TakeItemEffect";
import { calcPanelOffset } from "../roomPanelProjectionUtil";
import { drawItemAtCanvasPosition } from "../itemDrawUtil";
import Character from "@/game/types/Character";
import Item from "@/game/types/Item";
import ScalingFactors from "@/game/types/ScalingFactors";
import { CharacterLayout } from "./characterLayoutUtil";

function _createHeldItemDrawMetrics(scalingFactors:ScalingFactors) {
  const [panelOffsetX, panelOffsetY] = calcPanelOffset(scalingFactors);
  const baseWidthPixels = Math.max(6, scalingFactors.roomLineWidth * 3.5);
  const cuboidWidthPixels = calcItemCuboidWidthPixels(baseWidthPixels);
  return {
    cuboidWidthPixels,
    cuboidHeightPixels:calcItemCuboidHeightPixels(cuboidWidthPixels),
    cuboidDepthXPixels:Math.max(2, panelOffsetX / 4),
    cuboidDepthYPixels:Math.max(1, panelOffsetY / 4),
    cuboidLineWidthPixels:Math.max(0.5, scalingFactors.roomLineWidth * 0.25)
  };
}

function _drawHeldItem(item:Item, handX:number, handY:number, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const metrics = _createHeldItemDrawMetrics(scalingFactors);
  drawItemAtCanvasPosition(item, handX, handY + metrics.cuboidHeightPixels * 0.35, metrics, context);
}

function _hasMatchingTakeItemEffect(character:Character, item:Item, effects:Effect[]):boolean {
  return effects.some(effect => {
    if (effect.type !== EffectType.TAKE_ITEM) return false;
    const takeItemEffect = effect as TakeItemEffect;
    if (!takeItemEffect.character) return false;
    return takeItemEffect.character.id === character.id && takeItemEffect.item.id === item.id;
  });
}

function _findBackHandItem(character:Character):Item|null {
  if (character.facingDirection === 'right') return character.leftHandItem;
  return character.rightHandItem;
}

function _findFrontHandItem(character:Character):Item|null {
  if (character.facingDirection === 'right') return character.rightHandItem;
  return character.leftHandItem;
}

export function drawHeldItemsBehindCharacter(character:Character, layout:CharacterLayout,
  effects:Effect[], scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const backHandItem = _findBackHandItem(character);
  if (!backHandItem) return;
  if (_hasMatchingTakeItemEffect(character, backHandItem, effects)) return;
  const handPosition = character.facingDirection === 'right' ? layout.leftHand : layout.rightHand;
  _drawHeldItem(backHandItem, handPosition.x, handPosition.y, scalingFactors, context);
}

export function drawHeldItemsInFrontOfCharacter(character:Character, layout:CharacterLayout,
  effects:Effect[], scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const frontHandItem = _findFrontHandItem(character);
  if (!frontHandItem) return;
  if (_hasMatchingTakeItemEffect(character, frontHandItem, effects)) return;
  const handPosition = character.facingDirection === 'right' ? layout.rightHand : layout.leftHand;
  _drawHeldItem(frontHandItem, handPosition.x, handPosition.y, scalingFactors, context);
}