/* This module groups hand-held item drawing helpers, including per-hand layering and in-hand item metrics.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { calcItemCuboidHeightPixels, calcItemCuboidWidthPixels } from "@/game/itemSizeUtil";
import { isItemInteractive } from "@/game/interactivityUtil";
import { COLUMN_WIDTH } from "@/game/roomGridUtil";
import { calcPanelOffset } from "../roomPanelProjectionUtil";
import { createItemDrawRect, drawItemAtCanvasPosition } from "../itemDrawUtil";
import Character from "@/game/types/Character";
import Item from "@/game/types/Item";
import ScalingFactors from "@/game/types/ScalingFactors";
import ImageSet from "@/game/types/ImageSet";
import { CharacterLayout } from "./characterLayoutUtil";

function _createHeldItemDrawRect(scalingFactors:ScalingFactors) {
  const [panelOffsetX, panelOffsetY] = calcPanelOffset(scalingFactors);
  const baseWidthPixels = COLUMN_WIDTH * scalingFactors.scaleX;
  const cuboidWidthPixels = calcItemCuboidWidthPixels(baseWidthPixels);
  const cuboidHeightPixels = calcItemCuboidHeightPixels(cuboidWidthPixels);
  const cuboidDepthXPixels = Math.max(2, panelOffsetX / 4);
  const cuboidDepthYPixels = Math.max(1, panelOffsetY / 4);
  return {
    cuboidHeightPixels,
    ...createItemDrawRect(cuboidWidthPixels, cuboidHeightPixels, cuboidDepthXPixels, cuboidDepthYPixels)
  };
}

function _calcHandYOffset(scalingFactors:ScalingFactors):number {
  const baseWidthPixels = COLUMN_WIDTH * scalingFactors.scaleX;
  const cuboidWidthPixels = calcItemCuboidWidthPixels(baseWidthPixels);
  const cuboidHeightPixels = calcItemCuboidHeightPixels(cuboidWidthPixels);
  return cuboidHeightPixels;
}

function _drawHeldItem(item:Item, handX:number, handY:number, scalingFactors:ScalingFactors,
  context:CanvasRenderingContext2D, imageSet:ImageSet) {
  const imageDrawRect = _createHeldItemDrawRect(scalingFactors);
  const handYOffset = _calcHandYOffset(scalingFactors);
  drawItemAtCanvasPosition(item, handX, handY + handYOffset * 0.35, imageDrawRect, context, imageSet);
}

function _findBackHandItem(character:Character):Item|null {
  if (character.facingDirection === 'right') return character.leftHandItem;
  return character.rightHandItem;
}

function _findFrontHandItem(character:Character):Item|null {
  if (character.facingDirection === 'right') return character.rightHandItem;
  return character.leftHandItem;
}

export function hasDrawnUndiscoveredHeldItem(character:Character, discoveredItemIds:ReadonlySet<string>):boolean {
  return [character.leftHandItem, character.rightHandItem]
    .some(item => !!item && isItemInteractive(item) && !discoveredItemIds.has(item.id));
}

export function drawHeldItemsBehindCharacter(character:Character, layout:CharacterLayout,
  scalingFactors:ScalingFactors, context:CanvasRenderingContext2D, imageSet:ImageSet) {
  const backHandItem = _findBackHandItem(character);
  if (!backHandItem) return;
  const handPosition = character.facingDirection === 'right' ? layout.leftHand : layout.rightHand;
  _drawHeldItem(backHandItem, handPosition.x, handPosition.y, scalingFactors, context, imageSet);
}

export function drawHeldItemsInFrontOfCharacter(character:Character, layout:CharacterLayout,
  scalingFactors:ScalingFactors, context:CanvasRenderingContext2D, imageSet:ImageSet) {
  const frontHandItem = _findFrontHandItem(character);
  if (!frontHandItem) return;
  const handPosition = character.facingDirection === 'right' ? layout.rightHand : layout.leftHand;
  _drawHeldItem(frontHandItem, handPosition.x, handPosition.y, scalingFactors, context, imageSet);
}