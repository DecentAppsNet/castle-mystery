/* This module groups character-focused drawing helpers, including visible character rendering and character popovers.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { clamp } from "@/common/numberUtil";
import { isCharacterInteractive } from "@/game/interactivityUtil";
import { MAP_TILE_SIZE } from "../roomGridUtil";
import { gameToCanvasPosition } from "./drawUtil";
import { calcPanelOffset } from "./roomPanelProjectionUtil";
import Effect from "@/game/effects/types/Effect";
import Character from "../types/Character";
import Rect from "../types/Rect";
import Room from "../types/Room";
import ScalingFactors from "../types/ScalingFactors";
import ImageSet from "../types/ImageSet";
import { COLOR_ACTIVE_CHARACTER_HIGHLIGHT, COLOR_BLACK } from "./drawConstants";
import { drawTextPopover } from "./popoverDrawUtil";
import { createCharacterLayout, strokeCharacterBody } from "./characters/characterLayoutUtil";
import { drawHeldItemsBehindCharacter, drawHeldItemsInFrontOfCharacter } from "./characters/characterHeldItemDrawUtil";

export { drawSpeechBubble, drawThoughtBubble } from "./characters/characterBubbleDrawUtil";

const PULSE_CADENCE_MS = 1000;
const PULSE_SCALE_PEAK = 1.2;
const CHARACTER_SWAY_INTERVAL = 1500;
const CHARACTER_SWAY_AMOUNT = 1;
const CHARACTER_HEIGHT_STORY_RATIO = 0.4;
const CHARACTER_WIDTH_HEIGHT_RATIO = 0.5;

function _getCharacterSizePixels(scalingFactors:ScalingFactors):{ characterWidth:number, characterHeight:number } {
  const characterHeight = MAP_TILE_SIZE * CHARACTER_HEIGHT_STORY_RATIO * scalingFactors.scaleY;
  return {
    characterWidth:characterHeight * CHARACTER_WIDTH_HEIGHT_RATIO,
    characterHeight
  };
}

function _getCharacterCanvasBottomPosition(character:Character, scalingFactors:ScalingFactors):[number, number] {
  const [baseX, baseY] = gameToCanvasPosition(character.position.x, character.position.y, scalingFactors);
  const [offsetX, offsetY] = calcPanelOffset(scalingFactors);
  const depth = clamp(character.position.z, 0, 1);
  return [baseX + offsetX * depth, baseY + offsetY * depth];
}

function _getCharacterDisplayName(character:Character):string {
  return character.title;
}

function _countInHandItems(character:Character):number {
  return (character.leftHandItem ? 1 : 0) + (character.rightHandItem ? 1 : 0);
}

function _countCarriedItems(character:Character):number {
  return character.items.length + _countInHandItems(character);
}

function _getCharacterCarryText(character:Character):string {
  const itemCount = _countCarriedItems(character);
  const inHandItemCount = _countInHandItems(character);
  const inHandText = inHandItemCount > 0 
    ? (itemCount === inHandItemCount) 
      ? ` (in hand)`
      : ` (${inHandItemCount} in hand)` 
    : ``;
  if (itemCount === 0) return "Carrying nothing.";
  if (itemCount === 1) return `Carrying 1 item${inHandText}.`;
  return `Carrying ${itemCount} items${inHandText}.`;
}

function _getCharacterCanvasRect(character:Character, scalingFactors:ScalingFactors, time:number):Rect {
  const { anchorX:backboneX, centerY, characterWidth, characterHeight } = getCharacterSpeechAnchor(character, scalingFactors, time);
  const layout = createCharacterLayout(backboneX, centerY, characterWidth, characterHeight, character.facingDirection, character.bodyOrientation);
  const segmentXs = layout.segments.flatMap(segment => [segment.fromX, segment.toX]);
  const leftX = Math.min(layout.head.centerX - layout.head.radius, ...segmentXs);
  const rightX = Math.max(layout.head.centerX + layout.head.radius, ...segmentXs);
  return {
    x:leftX,
    y:layout.topY,
    width:rightX - leftX,
    height:layout.bottomY - layout.topY
  };
}

export function getCharacterBodyCenterCanvasPosition(character:Character, scalingFactors:ScalingFactors, time:number):{ x:number, y:number } {
  const { anchorX:backboneX, centerY, characterWidth, characterHeight } = getCharacterSpeechAnchor(character, scalingFactors, time);
  const layout = createCharacterLayout(backboneX, centerY, characterWidth, characterHeight, character.facingDirection, character.bodyOrientation);
  const bodySegment = layout.segments[0];
  return {
    x:(bodySegment.fromX + bodySegment.toX) / 2,
    y:(bodySegment.fromY + bodySegment.toY) / 2
  };
}

export function getCharacterSpeechAnchor(character:Character, scalingFactors:ScalingFactors, time:number) {
  const [centerX, bottomY] = _getCharacterCanvasBottomPosition(character, scalingFactors);
  const { characterWidth, characterHeight } = _getCharacterSizePixels(scalingFactors);
  const provisionalLayout = createCharacterLayout(0, 0, characterWidth, characterHeight, character.facingDirection, character.bodyOrientation);
  const centerY = Math.round(bottomY - provisionalLayout.bottomY);
  const swayPhase = ((time + character.randomSalt * CHARACTER_SWAY_INTERVAL) % CHARACTER_SWAY_INTERVAL) / CHARACTER_SWAY_INTERVAL;
  const sway = character.isAlive ? Math.sin(swayPhase * 2 * Math.PI) * CHARACTER_SWAY_AMOUNT : 0;
  const anchorX = centerX + sway;
  const anchorTopY = Math.round(centerY + provisionalLayout.topY);
  return { anchorX, anchorTopY, centerX, centerY, characterWidth, characterHeight:provisionalLayout.bottomY - provisionalLayout.topY };
}

function _drawActiveCharacterHighlight(centerX:number, centerY:number, characterWidth:number, characterHeight:number,
  scalingFactors:ScalingFactors, context:CanvasRenderingContext2D, time:number) {
  const baseRadius = Math.hypot(characterWidth / 2, characterHeight / 2) / 2 + scalingFactors.roomLineWidth;
  const phase = (time % PULSE_CADENCE_MS) / PULSE_CADENCE_MS;
  const pulse = phase <= 0.5 ? phase * 2 : 2 * (1 - phase);
  const radius = baseRadius * (1 + (PULSE_SCALE_PEAK - 1) * pulse);
  context.fillStyle = COLOR_ACTIVE_CHARACTER_HIGHLIGHT;
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.fill();
}


export function drawObscuredActiveCharacter(room:Room, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const [roomLeft] = gameToCanvasPosition(room.rect.x, room.rect.y, scalingFactors);
  const [roomRight, roomBottom] = gameToCanvasPosition(room.rect.x + room.rect.width, room.rect.y + room.rect.height, scalingFactors);
  const centerX = roomLeft + (roomRight - roomLeft) / 2;
  const { characterWidth, characterHeight } = _getCharacterSizePixels(scalingFactors);
  const headRadius = Math.min(characterWidth, characterHeight) / 4;
  const bottomY = roomBottom - scalingFactors.roomLineWidth;
  const centerY = bottomY - characterHeight / 2;
  const backboneX = centerX;

  context.save();
  context.lineWidth = scalingFactors.roomLineWidth;
  context.strokeStyle = "#fff";
  context.fillStyle = "#fff";
  context.beginPath();
  context.moveTo(backboneX, centerY - characterHeight / 4 + headRadius);
  context.lineTo(backboneX, centerY + characterHeight / 4);
  context.moveTo(backboneX, centerY);
  context.lineTo(centerX - characterWidth / 2, centerY + characterHeight / 8);
  context.moveTo(backboneX, centerY);
  context.lineTo(centerX + characterWidth / 2, centerY + characterHeight / 8);
  context.moveTo(backboneX, centerY + characterHeight / 4);
  context.lineTo(centerX - characterWidth / 2, centerY + characterHeight / 2);
  context.moveTo(backboneX, centerY + characterHeight / 4);
  context.lineTo(centerX + characterWidth / 2, centerY + characterHeight / 2);
  context.stroke();
  context.beginPath();
  context.arc(backboneX, centerY - characterHeight / 4, headRadius, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

export function drawCharacter(character:Character, scalingFactors:ScalingFactors,
  context:CanvasRenderingContext2D, time:number, imageSet:ImageSet, effects:Effect[], isHighlighted:boolean) {
  const { anchorX:backboneX, centerX, centerY, characterWidth, characterHeight } = getCharacterSpeechAnchor(character, scalingFactors, time);
  const faceImage = character.faceImageUrl ? imageSet.get(character.faceImageUrl) || null : null;
  if (isHighlighted) _drawActiveCharacterHighlight(centerX, centerY, characterWidth, characterHeight, scalingFactors, context, time);
  context.lineWidth = scalingFactors.roomLineWidth;
  context.strokeStyle = COLOR_BLACK;
  const layout = createCharacterLayout(backboneX, centerY, characterWidth, characterHeight, character.facingDirection, character.bodyOrientation);
  drawHeldItemsBehindCharacter(character, layout, effects, scalingFactors, context, imageSet);
  strokeCharacterBody(layout, context);
  const headRadius = layout.head.radius;
  if (!faceImage) {
    context.beginPath();
    context.moveTo(layout.head.centerX + headRadius, layout.head.centerY);
    context.arc(layout.head.centerX, layout.head.centerY, headRadius, 0, Math.PI * 2);
    context.stroke();
    drawHeldItemsInFrontOfCharacter(character, layout, effects, scalingFactors, context, imageSet);
    return;
  }

  const faceImageWidth = faceImage.width;
  const faceImageHeight = faceImage.height;
  if (!faceImageWidth || !faceImageHeight) {
    context.beginPath();
    context.arc(layout.head.centerX, layout.head.centerY, headRadius, 0, Math.PI * 2);
    context.stroke();
    drawHeldItemsInFrontOfCharacter(character, layout, effects, scalingFactors, context, imageSet);
    return;
  }
  const maxFaceWidth = headRadius * 6;
  const maxFaceHeight = headRadius * 6;
  const faceScale = Math.min(maxFaceWidth / faceImageWidth, maxFaceHeight / faceImageHeight);
  const drawWidth = faceImageWidth * faceScale;
  const drawHeight = faceImageHeight * faceScale;
  if (character.bodyOrientation !== 'laying') {
    const drawX = layout.head.centerX - drawWidth / 2;
    const drawY = layout.head.centerY - drawHeight / 2;
    if (character.facingDirection === 'left') {
      context.save();
      context.translate(drawX + drawWidth, 0);
      context.scale(-1, 1);
      context.drawImage(faceImage, 0, drawY, drawWidth, drawHeight);
      context.restore();
      drawHeldItemsInFrontOfCharacter(character, layout, effects, scalingFactors, context, imageSet);
      return;
    }
    context.drawImage(faceImage, drawX, drawY, drawWidth, drawHeight);
    drawHeldItemsInFrontOfCharacter(character, layout, effects, scalingFactors, context, imageSet);
    return;
  }

  context.save();
  context.translate(layout.head.centerX, layout.head.centerY);
  context.rotate(character.facingDirection === 'right' ? -Math.PI / 2 : Math.PI / 2);
  context.drawImage(faceImage, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
  context.restore();
  drawHeldItemsInFrontOfCharacter(character, layout, effects, scalingFactors, context, imageSet);
}

export function drawCharacterPopover(character:Character, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D, time:number) {
  if (!isCharacterInteractive(character)) return;
  const title = character.isTitleKnown ? _getCharacterDisplayName(character) : "";
  const carryText = _getCharacterCarryText(character);
  drawTextPopover({ targetRect:_getCharacterCanvasRect(character, scalingFactors, time), title,
    bodyTexts:[character.description, carryText], scalingFactors, context });
}
