/* This file groups character-focused drawing helpers, including visible character rendering and character popovers.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { clamp } from "@/common/numberUtil";
import CanvasLayoutPlanner from "@/game/CanvasLayoutPlanner";
import { isCharacterInteractive } from "@/game/interactivityUtil";
import { MAP_TILE_SIZE } from "../roomGridUtil";
import { gameToCanvasPosition } from "./drawUtil";
import { calcPanelOffset } from "./roomPanelProjectionUtil";
import Character from "../types/Character";
import Rect from "../types/Rect";
import Room from "../types/Room";
import ScalingFactors from "../types/ScalingFactors";
import ImageSet from "../types/ImageSet";
import Item from "../types/Item";
import Position from "../types/Position";
import { COLOR_ACTIVE_CHARACTER_HIGHLIGHT, COLOR_BLACK } from "./drawColorConstants";
import { drawPopover, PopoverBodyEntry } from "./popoverDrawUtil";
import { createCharacterLayout, strokeCharacterBody } from "./characters/characterLayoutUtil";
import { drawHeldItemsBehindCharacter, drawHeldItemsInFrontOfCharacter } from "./characters/characterHeldItemDrawUtil";
import { createRect, extendRectToContainRect } from "@/game/rectUtil";
import { canvasToGamePosition } from "./drawUtil";
import { UNKNOWN_ITEM_ICON_URL } from "@/game/discoveryIconUrlUtil";
import { findImageBitmap } from "@/game/imageAssetUtil";
import { createScratchCanvas } from "./canvasSurfaceUtil";
import { projectRoomPointWithDepth } from "./roomPanelProjectionUtil";
import { wrapRoomTitle } from "./roomTitleLayoutUtil";
import { createRoomContentDisplayLayout } from "@/game/roomContentDisplayPositionUtil";
import SpriteOverride from "../effects/types/SpriteOverride";

const PULSE_CADENCE_MS = 1000;
const PULSE_SCALE_PEAK = 1.2;
const CHARACTER_SWAY_INTERVAL = 1500;
const CHARACTER_SWAY_AMOUNT = 1;
const CHARACTER_HEIGHT_STORY_RATIO = 0.4;
const CHARACTER_WIDTH_HEIGHT_RATIO = 0.5;
const OBSCURED_ACTIVE_HEAD_WORLD_WIDTH = 3;
const OBSCURED_ACTIVE_HEAD_WORLD_HEIGHT = 3;
const OBSCURED_ACTIVE_HEAD_TITLE_GAP_RATIO = 0.5;
const ROOM_TITLE_MARGIN = 2;

type ScratchCanvas = OffscreenCanvas|HTMLCanvasElement;

const _obscuredActiveHeadSilhouetteCanvasCache = new WeakMap<ImageBitmap, Map<string, ScratchCanvas>>();

function _getCharacterSizePixels(scalingFactors:ScalingFactors):{ characterWidth:number, characterHeight:number } {
  const characterHeight = MAP_TILE_SIZE * CHARACTER_HEIGHT_STORY_RATIO * scalingFactors.scaleY;
  return {
    characterWidth:characterHeight * CHARACTER_WIDTH_HEIGHT_RATIO,
    characterHeight
  };
}

function _calcObscuredActiveHeadCacheKey(widthPixels:number, heightPixels:number):string {
  return `${Math.max(1, Math.round(widthPixels))}|${Math.max(1, Math.round(heightPixels))}`;
}

function _renderObscuredActiveHeadSilhouetteCanvas(faceImage:ImageBitmap, silhouetteCanvas:ScratchCanvas) {
  const context = silhouetteCanvas.getContext("2d", { willReadFrequently:false }) as CanvasRenderingContext2D|OffscreenCanvasRenderingContext2D|null;
  if (!context) return;

  context.clearRect(0, 0, silhouetteCanvas.width, silhouetteCanvas.height);
  context.drawImage(faceImage, 0, 0, silhouetteCanvas.width, silhouetteCanvas.height);
  context.globalCompositeOperation = 'source-in';
  context.fillStyle = '#fff';
  context.fillRect(0, 0, silhouetteCanvas.width, silhouetteCanvas.height);
  context.globalCompositeOperation = 'source-over';
}

function _findObscuredActiveHeadSilhouetteCanvas(faceImage:ImageBitmap, widthPixels:number, heightPixels:number):ScratchCanvas|null {
  const cacheKey = _calcObscuredActiveHeadCacheKey(widthPixels, heightPixels);
  const cachedCanvasesBySize = _obscuredActiveHeadSilhouetteCanvasCache.get(faceImage) ?? new Map<string, ScratchCanvas>();
  const cachedCanvas = cachedCanvasesBySize.get(cacheKey) || null;
  if (cachedCanvas) return cachedCanvas;

  const silhouetteCanvas = createScratchCanvas(Math.max(1, Math.round(widthPixels)), Math.max(1, Math.round(heightPixels)));
  if (!silhouetteCanvas) return null;

  _renderObscuredActiveHeadSilhouetteCanvas(faceImage, silhouetteCanvas);
  cachedCanvasesBySize.set(cacheKey, silhouetteCanvas);
  _obscuredActiveHeadSilhouetteCanvasCache.set(faceImage, cachedCanvasesBySize);
  return silhouetteCanvas;
}

function _getCharacterCanvasBottomPosition(displayPosition:Position, scalingFactors:ScalingFactors):[number, number] {
  const [baseX, baseY] = gameToCanvasPosition(displayPosition.x, displayPosition.y, scalingFactors);
  const [offsetX, offsetY] = calcPanelOffset(scalingFactors);
  const depth = clamp(displayPosition.z, 0, 1);
  return [baseX + offsetX * depth, baseY + offsetY * depth];
}

function _getCharacterDisplayName(character:Character):string {
  return character.title;
}

function _calcRoomTitleMaxWidth(room:Room, scalingFactors:ScalingFactors):number {
  const titleMargin = Math.min(ROOM_TITLE_MARGIN, room.rect.width / 2);

  const [leftX] = projectRoomPointWithDepth(room.rect.x + titleMargin, room.rect.y + room.rect.height / 2, 1, scalingFactors);
  const [rightX] = projectRoomPointWithDepth(room.rect.x + room.rect.width - titleMargin, room.rect.y + room.rect.height / 2, 1, scalingFactors);
  return Math.max(0, rightX - leftX);
}

function _measureWrappedRoomTitleLines(room:Room, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D):string[] {
  const font = `${scalingFactors.roomFontHeight}px Jellee`;
  return wrapRoomTitle(room.title, _calcRoomTitleMaxWidth(room, scalingFactors), titleText => {
    context.save();
    context.font = font;
    const measuredWidth = context.measureText(titleText).width;
    context.restore();
    return measuredWidth;
  });
}

function _getObscuredActiveHeadAnchor(room:Room, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D):{ centerX:number, centerY:number } {
  const [centerX, titleCenterY] = projectRoomPointWithDepth(
    room.rect.x + room.rect.width / 2,
    room.rect.y + room.rect.height / 2,
    1,
    scalingFactors
  );
  const titleLines = _measureWrappedRoomTitleLines(room, scalingFactors, context);
  const titleHeight = titleLines.length * scalingFactors.roomFontHeight;
  const titleBottomY = titleCenterY + titleHeight / 2;
  const headHeightPixels = OBSCURED_ACTIVE_HEAD_WORLD_HEIGHT * scalingFactors.scaleY;
  const gapPixels = scalingFactors.roomFontHeight * OBSCURED_ACTIVE_HEAD_TITLE_GAP_RATIO;
  return {
    centerX,
    centerY:titleBottomY + gapPixels + headHeightPixels / 2
  };
}

function _getObscuredActiveHeadSizePixels(scalingFactors:ScalingFactors):{ widthPixels:number, heightPixels:number } {
  return {
    widthPixels:OBSCURED_ACTIVE_HEAD_WORLD_WIDTH * scalingFactors.scaleX,
    heightPixels:OBSCURED_ACTIVE_HEAD_WORLD_HEIGHT * scalingFactors.scaleY
  };
}

function _drawObscuredActiveHeadFallback(centerX:number, centerY:number, widthPixels:number, heightPixels:number,
  context:CanvasRenderingContext2D) {
  context.save();
  context.fillStyle = '#fff';
  context.beginPath();
  context.ellipse(centerX, centerY, widthPixels / 2, heightPixels / 2, 0, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function _countInHandItems(character:Character):number {
  return (character.leftHandItem ? 1 : 0) + (character.rightHandItem ? 1 : 0);
}

function _createHiddenCarryText(character:Character):string|null {
  const hiddenItemCount = character.items.length;
  const inHandItemCount = _countInHandItems(character);
  if (inHandItemCount === 0) {
    if (hiddenItemCount === 0) return "Carrying nothing.";
    if (hiddenItemCount === 1) return "Carrying 1 hidden item.";
    return `Carrying ${hiddenItemCount} hidden items.`;
  }
  if (hiddenItemCount === 0) return null;
  if (hiddenItemCount === 1) return "Carrying 1 other hidden item.";
  return `Carrying ${hiddenItemCount} other hidden items.`;
}

function _createHeldItemPopoverEntry(item:Item, handLabel:'left hand'|'right hand'):PopoverBodyEntry {
  return {
    type:'imageTextRow',
    imageUrl:item.imageUrl || UNKNOWN_ITEM_ICON_URL,
    text:`${item.title} (${handLabel})|${item.description}`
  };
}

function _createCharacterPopoverBodyEntries(character:Character):PopoverBodyEntry[] {
  const bodyEntries:PopoverBodyEntry[] = [{ type:'text', text:character.description }];
  const heldItemEntries:PopoverBodyEntry[] = [];
  if (character.rightHandItem) heldItemEntries.push(_createHeldItemPopoverEntry(character.rightHandItem, 'right hand'));
  if (character.leftHandItem) heldItemEntries.push(_createHeldItemPopoverEntry(character.leftHandItem, 'left hand'));
  const hiddenCarryText = _createHiddenCarryText(character);
  if (heldItemEntries.length) {
    bodyEntries.push({ type:'separator' });
    bodyEntries.push(...heldItemEntries);
  }
  if (hiddenCarryText) {
    bodyEntries.push({ type:'separator' });
    bodyEntries.push({ type:'text', text:hiddenCarryText });
  }
  return bodyEntries;
}

export function createCharacterCanvasLayout(character:Character, displayPosition:Position,
    scalingFactors:ScalingFactors, time:number) {
  const { anchorX:backboneX, anchorTopY, centerX, centerY, characterWidth, characterHeight } = getCharacterSpeechAnchor(
    character, displayPosition, scalingFactors, time);
  const layout = createCharacterLayout(backboneX, centerY, characterWidth, characterHeight, character.facingDirection, character.bodyOrientation);
  return {
    layout,
    characterWidth,
    characterHeight,
    characterCenterCanvasPoint:[backboneX, centerY] as [number, number],
    highlightCenterX:centerX,
    anchorTopY
  };
}

function _getFaceImageDrawSize(faceImage:ImageBitmap, headRadius:number):{ drawWidth:number, drawHeight:number }|null {
  const faceImageWidth = faceImage.width;
  const faceImageHeight = faceImage.height;
  if (!faceImageWidth || !faceImageHeight) return null;
  const maxFaceWidth = headRadius * 6;
  const maxFaceHeight = headRadius * 6;
  const faceScale = Math.min(maxFaceWidth / faceImageWidth, maxFaceHeight / faceImageHeight);
  return {
    drawWidth:faceImageWidth * faceScale,
    drawHeight:faceImageHeight * faceScale
  };
}

function _getCharacterBodyCanvasRect(character:Character, displayPosition:Position,
  scalingFactors:ScalingFactors, time:number):Rect {
  const { layout } = createCharacterCanvasLayout(character, displayPosition, scalingFactors, time);
  const segmentXs = layout.segments.flatMap(segment => [segment.fromX, segment.toX]);
  const leftX = Math.min(layout.head.centerX - layout.head.radius, ...segmentXs);
  const rightX = Math.max(layout.head.centerX + layout.head.radius, ...segmentXs);
  return createRect(leftX, layout.topY, rightX - leftX, layout.bottomY - layout.topY);
}

function _getCharacterFaceCanvasRect(character:Character, displayPosition:Position,
  scalingFactors:ScalingFactors, time:number, imageSet:ImageSet):Rect|null {
  if (!character.faceImageUrl) return null;
  const faceImage = findImageBitmap(imageSet, character.faceImageUrl);
  if (!faceImage) return null;

  const { layout } = createCharacterCanvasLayout(character, displayPosition, scalingFactors, time);
  const faceImageDrawSize = _getFaceImageDrawSize(faceImage, layout.head.radius);
  if (!faceImageDrawSize) return null;

  const drawWidth = character.bodyOrientation === 'laying' ? faceImageDrawSize.drawHeight : faceImageDrawSize.drawWidth;
  const drawHeight = character.bodyOrientation === 'laying' ? faceImageDrawSize.drawWidth : faceImageDrawSize.drawHeight;
  return createRect(layout.head.centerX - drawWidth / 2, layout.head.centerY - drawHeight / 2, drawWidth, drawHeight);
}

export function getCharacterCanvasRect(character:Character, displayPosition:Position, scalingFactors:ScalingFactors,
  time:number, imageSet:ImageSet|null = null):Rect {
  const bodyRect = _getCharacterBodyCanvasRect(character, displayPosition, scalingFactors, time);
  if (!imageSet) return bodyRect;
  const faceRect = _getCharacterFaceCanvasRect(character, displayPosition, scalingFactors, time, imageSet);
  return faceRect ? extendRectToContainRect(bodyRect, faceRect) : bodyRect;
}

export function getCharacterHoverRect(character:Character, displayPosition:Position,
  scalingFactors:ScalingFactors, time:number, imageSet:ImageSet):Rect {
  const canvasRect = getCharacterCanvasRect(character, displayPosition, scalingFactors, time, imageSet);
  const [left, top] = canvasToGamePosition(canvasRect.x, canvasRect.y, scalingFactors);
  const [right, bottom] = canvasToGamePosition(canvasRect.x + canvasRect.width, canvasRect.y + canvasRect.height, scalingFactors);
  return createRect(left, top, right - left, bottom - top);
}

export function getCharacterSpeechAnchor(character:Character, displayPosition:Position,
  scalingFactors:ScalingFactors, time:number) {
  const [centerX, bottomY] = _getCharacterCanvasBottomPosition(displayPosition, scalingFactors);
  const { characterWidth, characterHeight } = _getCharacterSizePixels(scalingFactors);
  const provisionalLayout = createCharacterLayout(0, 0, characterWidth, characterHeight, character.facingDirection, character.bodyOrientation);
  const centerY = Math.round(bottomY - provisionalLayout.bottomY);
  const swayPhase = ((time + character.randomSalt * CHARACTER_SWAY_INTERVAL) % CHARACTER_SWAY_INTERVAL) / CHARACTER_SWAY_INTERVAL;
  const sway = Math.sin(swayPhase * 2 * Math.PI) * CHARACTER_SWAY_AMOUNT;
  const anchorX = centerX + sway;
  const anchorTopY = Math.round(centerY + provisionalLayout.topY);
  return { anchorX, anchorTopY, centerX, centerY, characterWidth, characterHeight:provisionalLayout.bottomY - provisionalLayout.topY };
}

function _drawActiveCharacterHighlight(centerX:number, centerY:number, characterWidth:number, characterHeight:number,
  scalingFactors:ScalingFactors, context:CanvasRenderingContext2D, metaTime:number) {
  const baseRadius = Math.hypot(characterWidth / 2, characterHeight / 2) / 2 + scalingFactors.roomLineWidth;
  const phase = (metaTime % PULSE_CADENCE_MS) / PULSE_CADENCE_MS;
  const pulse = phase <= 0.5 ? phase * 2 : 2 * (1 - phase);
  const radius = baseRadius * (1 + (PULSE_SCALE_PEAK - 1) * pulse);
  context.fillStyle = COLOR_ACTIVE_CHARACTER_HIGHLIGHT;
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.fill();
}

export function drawObscuredActiveCharacter(room:Room, activeCharacter:Character, scalingFactors:ScalingFactors,
  context:CanvasRenderingContext2D, imageSet:ImageSet) {
  const { centerX, centerY } = _getObscuredActiveHeadAnchor(room, scalingFactors, context);
  const { widthPixels, heightPixels } = _getObscuredActiveHeadSizePixels(scalingFactors);
  const faceImage = findImageBitmap(imageSet, activeCharacter.faceImageUrl);

  context.save();
  context.translate(centerX, centerY);

  if (!faceImage) {
    _drawObscuredActiveHeadFallback(0, 0, widthPixels, heightPixels, context);
    context.restore();
    return;
  }

  const silhouetteCanvas = _findObscuredActiveHeadSilhouetteCanvas(faceImage, widthPixels, heightPixels);
  if (!silhouetteCanvas) {
    _drawObscuredActiveHeadFallback(0, 0, widthPixels, heightPixels, context);
    context.restore();
    return;
  }

  context.drawImage(silhouetteCanvas, -widthPixels / 2, -heightPixels / 2, widthPixels, heightPixels);
  context.restore();
}

function _findHeadRotationSpriteOverride(spriteOverrides:SpriteOverride[]):number {
  return spriteOverrides.find(spriteOverride =>
    spriteOverride.spriteKind === 'head')?.rotateRadians ?? 0;
}

export function drawCharacter(character:Character, displayPosition:Position, scalingFactors:ScalingFactors,
    context:CanvasRenderingContext2D, gameTime:number, imageSet:ImageSet, isHighlighted:boolean,
    metaTime:number, spriteOverrides:SpriteOverride[],
    characterCanvasLayout = createCharacterCanvasLayout(character, displayPosition, scalingFactors, gameTime)) {
  const { layout, characterWidth, characterHeight, characterCenterCanvasPoint:[, centerY],
    highlightCenterX:centerX } = characterCanvasLayout;
  const faceImage = findImageBitmap(imageSet, character.faceImageUrl);
  const faceAngleOffsetRadians = _findHeadRotationSpriteOverride(spriteOverrides);
  if (isHighlighted) _drawActiveCharacterHighlight(centerX, centerY, characterWidth, characterHeight, scalingFactors, context, metaTime);
  context.lineWidth = scalingFactors.roomLineWidth;
  context.strokeStyle = COLOR_BLACK;
  drawHeldItemsBehindCharacter(character, layout, scalingFactors, context, imageSet, spriteOverrides);
  strokeCharacterBody(layout, context);
  const headRadius = layout.head.radius;
  if (!faceImage) {
    context.beginPath();
    context.moveTo(layout.head.centerX + headRadius, layout.head.centerY);
    context.arc(layout.head.centerX, layout.head.centerY, headRadius, 0, Math.PI * 2);
    context.stroke();
    drawHeldItemsInFrontOfCharacter(character, layout, scalingFactors, context, imageSet, spriteOverrides);
    return;
  }

  const faceImageDrawSize = _getFaceImageDrawSize(faceImage, headRadius);
  if (!faceImageDrawSize) {
    context.beginPath();
    context.arc(layout.head.centerX, layout.head.centerY, headRadius, 0, Math.PI * 2);
    context.stroke();
    drawHeldItemsInFrontOfCharacter(character, layout, scalingFactors, context, imageSet, spriteOverrides);
    return;
  }
  const { drawWidth, drawHeight } = faceImageDrawSize;
  if (character.bodyOrientation !== 'laying') {
    context.save();
    context.translate(layout.head.centerX, layout.head.centerY);
    context.rotate(faceAngleOffsetRadians);
    if (character.facingDirection === 'left') context.scale(-1, 1);
    context.drawImage(faceImage, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    context.restore();
    drawHeldItemsInFrontOfCharacter(character, layout, scalingFactors, context, imageSet, spriteOverrides);
    return;
  }

  context.save();
  context.translate(layout.head.centerX, layout.head.centerY);
  context.rotate((character.facingDirection === 'right' ? -Math.PI / 2 : Math.PI / 2) + faceAngleOffsetRadians);
  if (character.facingDirection === 'left') context.scale(-1, 1);
  context.drawImage(faceImage, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
  context.restore();
  drawHeldItemsInFrontOfCharacter(character, layout, scalingFactors, context, imageSet, spriteOverrides);
}

export function drawCharacterPopover(character:Character, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D, time:number,
  imageSet:ImageSet, isTitleKnown:boolean, layoutPlanner:CanvasLayoutPlanner|null = null, room:Room|null = null) {
  if (!isCharacterInteractive(character)) return;
  const title = isTitleKnown ? _getCharacterDisplayName(character) : "";
  const displayLayout = room ? createRoomContentDisplayLayout(room, [character]) : null;
  const displayPosition = displayLayout?.characterLayoutById.get(character.id)?.displayPosition ?? character.position;
  drawPopover({ targetRect:getCharacterCanvasRect(character, displayPosition, scalingFactors, time, imageSet), title,
    bodyEntries:_createCharacterPopoverBodyEntries(character), scalingFactors, context, imageSet, layoutPlanner });
}
