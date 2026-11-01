/* This file groups hand-held item drawing helpers, including per-hand layering and in-hand item metrics.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { calcItemCuboidHeightPixels, calcItemCuboidWidthPixels } from "@/game/itemSizeUtil";
import { DRAW_CHARACTER_DIAGNOSTICS } from '@/developer/config';
import { isItemInteractive } from "@/game/interactivityUtil";
import { COLUMN_WIDTH } from "@/game/roomGridUtil";
import { calcPanelOffset } from "../roomPanelProjectionUtil";
import { createItemDrawRect, drawItemAtCanvasPosition, getItemCanvasRectAtCanvasPosition } from "../itemDrawUtil";
import Character from "@/game/types/Character";
import Item from "@/game/types/Item";
import ScalingFactors from "@/game/types/ScalingFactors";
import ImageSet from "@/game/types/ImageSet";
import SpriteOverride from "@/game/effects/types/SpriteOverride";
import CharacterLayout from '@/game/characterBody/types/CharacterLayout';
import CanvasBubbleAnchor from "@/game/effects/types/CanvasBubbleAnchor";
import { createCanvasAttachmentTransform, getHandArmPartKind, getResolvedBodyPart } from '@/game/characterBody';

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

/** Returns the selected gameplay hand's canvas-space attachment origin without an image offset. */
export function getHeldItemCanvasPoint(layout:CharacterLayout, hand:Hand):[number, number] {
  const handPosition = hand === 'left' ? layout.leftHand : layout.rightHand;
  return [handPosition.x, handPosition.y];
}

function _findHeldItemCanvasTranslation(spriteOverrides:SpriteOverride[], hand:Hand):[number, number] {
  const spriteKind = hand === 'left' ? 'leftHandItem' : 'rightHandItem';
  const override = spriteOverrides.find(candidate => candidate.spriteKind === spriteKind);
  return override && override.transformType === 'translateCanvas'
    ? [override.translateCanvasX, override.translateCanvasY]
    : [0, 0];
}

export function getHeldItemBubbleAnchor(item:Item, layout:CharacterLayout, hand:Hand,
    scalingFactors:ScalingFactors, imageSet:ImageSet,
    spriteOverrides:SpriteOverride[]):CanvasBubbleAnchor|null {
  if (!item.isVisible) return null;
  const imageDrawRect = _createHeldItemDrawRect(scalingFactors);
  const [itemX, itemY] = getHeldItemCanvasPoint(layout, hand);
  const [translateX, translateY] = _findHeldItemCanvasTranslation(spriteOverrides, hand);
  const rect = getItemCanvasRectAtCanvasPosition(
    item, itemX + translateX, itemY + translateY, imageDrawRect, imageSet);
  return { anchorX:rect.x + rect.width / 2, anchorTopY:rect.y };
}

function _drawHeldItem(item:Item, character:Character, layout:CharacterLayout, hand:Hand, scalingFactors:ScalingFactors,
  context:CanvasRenderingContext2D, imageSet:ImageSet, spriteOverrides:SpriteOverride[]):CanvasBubbleAnchor|null {
  const imageDrawRect = _createHeldItemDrawRect(scalingFactors);
  const rect = getItemCanvasRectAtCanvasPosition(item, 0, 0, imageDrawRect, imageSet);
  const armKind = getHandArmPartKind(character.rootBodyPart.imageUrl !== null, character.facingDirection, hand);
  const attachment = getResolvedBodyPart(layout.parts, armKind === 'nearArm' ? 'nearHand' : 'farHand');
  const transform = createCanvasAttachmentTransform(attachment.transform, scalingFactors);
  const [translateX, translateY] = _findHeldItemCanvasTranslation(spriteOverrides, hand);
  context.save();
  context.transform(transform.horizontalX, transform.horizontalY, transform.verticalX, transform.verticalY,
    transform.translateX + translateX, transform.translateY + translateY);
  drawItemAtCanvasPosition(item, -rect.x - rect.width / 2, -rect.y - rect.height / 2, imageDrawRect, context, imageSet);
  if (DRAW_CHARACTER_DIAGNOSTICS && rect.width > 0 && rect.height > 0) {
    context.strokeStyle = '#00f';
    context.lineWidth = 1;
    context.strokeRect(-rect.width / 2, -rect.height / 2, rect.width, rect.height);
  }
  context.restore();
  return getHeldItemBubbleAnchor(item, layout, hand, scalingFactors, imageSet, spriteOverrides);
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
    .some(item => !!item?.isVisible && isItemInteractive(item) && !discoveredItemIds.has(item.id));
}

export function drawHeldItemsBehindCharacter(character:Character, layout:CharacterLayout,
  scalingFactors:ScalingFactors, context:CanvasRenderingContext2D, imageSet:ImageSet,
  spriteOverrides:SpriteOverride[]) {
  const backHandItem = _findBackHandItem(character);
  if (!backHandItem?.isVisible) return;
  const hand = character.facingDirection === 'right' ? 'left' : 'right';
  _drawHeldItem(backHandItem, character, layout, hand, scalingFactors, context, imageSet, spriteOverrides);
}

export function drawHeldItemsInFrontOfCharacter(character:Character, layout:CharacterLayout,
  scalingFactors:ScalingFactors, context:CanvasRenderingContext2D, imageSet:ImageSet,
  spriteOverrides:SpriteOverride[]) {
  const frontHandItem = _findFrontHandItem(character);
  if (!frontHandItem?.isVisible) return;
  _drawHeldItem(frontHandItem, character, layout, character.facingDirection, scalingFactors, context, imageSet, spriteOverrides);
}