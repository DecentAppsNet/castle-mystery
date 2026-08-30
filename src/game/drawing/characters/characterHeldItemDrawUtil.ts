/* This file groups hand-held item drawing helpers, including per-hand layering and in-hand item metrics.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { calcItemCuboidHeightPixels, calcItemCuboidWidthPixels } from "@/game/itemSizeUtil";
import { isItemInteractive } from "@/game/interactivityUtil";
import { COLUMN_WIDTH } from "@/game/roomGridUtil";
import { calcPanelOffset } from "../roomPanelProjectionUtil";
import { createItemDrawRect, drawItemAtCanvasPosition } from "../itemDrawUtil";
import Character from "@/game/types/Character";
import Item from "@/game/types/Item";
import ScalingFactors from "@/game/types/ScalingFactors";
import ImageSet from "@/game/types/ImageSet";
import SpriteOverride from "@/game/effects/types/SpriteOverride";
import { CharacterLayout } from "./characterLayoutUtil";

type Hand = 'left'|'right';

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

export function getHeldItemCanvasPoint(layout:CharacterLayout, hand:Hand,
    scalingFactors:ScalingFactors):[number, number] {
  const handPosition = hand === 'left' ? layout.leftHand : layout.rightHand;
  return [handPosition.x, handPosition.y + _calcHandYOffset(scalingFactors) * 0.35];
}

function _findHeldItemCanvasTranslation(spriteOverrides:SpriteOverride[], hand:Hand):[number, number] {
  const spriteKind = hand === 'left' ? 'leftHandItem' : 'rightHandItem';
  const override = spriteOverrides.find(candidate => candidate.spriteKind === spriteKind);
  return override && override.transformType === 'translateCanvas'
    ? [override.translateCanvasX, override.translateCanvasY]
    : [0, 0];
}

function _drawHeldItem(item:Item, layout:CharacterLayout, hand:Hand, scalingFactors:ScalingFactors,
  context:CanvasRenderingContext2D, imageSet:ImageSet, spriteOverrides:SpriteOverride[]) {
  const imageDrawRect = _createHeldItemDrawRect(scalingFactors);
  const [itemX, itemY] = getHeldItemCanvasPoint(layout, hand, scalingFactors);
  const [translateX, translateY] = _findHeldItemCanvasTranslation(spriteOverrides, hand);
  drawItemAtCanvasPosition(item, itemX + translateX, itemY + translateY, imageDrawRect, context, imageSet);
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
  scalingFactors:ScalingFactors, context:CanvasRenderingContext2D, imageSet:ImageSet,
  spriteOverrides:SpriteOverride[]) {
  const backHandItem = _findBackHandItem(character);
  if (!backHandItem) return;
  const hand = character.facingDirection === 'right' ? 'left' : 'right';
  _drawHeldItem(backHandItem, layout, hand, scalingFactors, context, imageSet, spriteOverrides);
}

export function drawHeldItemsInFrontOfCharacter(character:Character, layout:CharacterLayout,
  scalingFactors:ScalingFactors, context:CanvasRenderingContext2D, imageSet:ImageSet,
  spriteOverrides:SpriteOverride[]) {
  const frontHandItem = _findFrontHandItem(character);
  if (!frontHandItem) return;
  _drawHeldItem(frontHandItem, layout, character.facingDirection, scalingFactors, context, imageSet, spriteOverrides);
}