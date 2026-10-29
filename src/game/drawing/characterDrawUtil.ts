/* This file groups character-focused drawing helpers, including visible character rendering and character popovers.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { clamp } from "@/common/numberUtil";
import { DRAW_CHARACTER_DIAGNOSTICS } from '@/developer/config';
import CanvasLayoutPlanner from "@/game/CanvasLayoutPlanner";
import { isCharacterInteractive } from "@/game/interactivityUtil";
import { createBodyCanvasLayout, createBodyPose, getBodyPaintOrder, calcHeadImageBounds, getHeadImageUrl, getResolvedBodyPart } from '@/game/characterBody';
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
import { drawCharacterAttachmentMarkers, drawCharacterBodyPart } from './characters/characterBodyDrawUtil';
import { drawCharacterHead } from './characters/characterHeadDrawUtil';
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
const OBSCURED_ACTIVE_HEAD_WORLD_WIDTH = 3;
const OBSCURED_ACTIVE_HEAD_WORLD_HEIGHT = 3;
const OBSCURED_ACTIVE_HEAD_TITLE_GAP_RATIO = 0.5;
const ROOM_TITLE_MARGIN = 2;

type ScratchCanvas = OffscreenCanvas|HTMLCanvasElement;

const _obscuredActiveHeadSilhouetteCanvasCache = new WeakMap<ImageBitmap, Map<string, ScratchCanvas>>();

function _calcObscuredActiveHeadCacheKey(widthPixels:number, heightPixels:number):string {
  return `${Math.max(1, Math.round(widthPixels))}|${Math.max(1, Math.round(heightPixels))}`;
}

function _renderObscuredActiveHeadSilhouetteCanvas(headImage:ImageBitmap, silhouetteCanvas:ScratchCanvas) {
  const context = silhouetteCanvas.getContext("2d", { willReadFrequently:false }) as CanvasRenderingContext2D|OffscreenCanvasRenderingContext2D|null;
  if (!context) return;

  context.clearRect(0, 0, silhouetteCanvas.width, silhouetteCanvas.height);
  context.drawImage(headImage, 0, 0, silhouetteCanvas.width, silhouetteCanvas.height);
  context.globalCompositeOperation = 'source-in';
  context.fillStyle = '#fff';
  context.fillRect(0, 0, silhouetteCanvas.width, silhouetteCanvas.height);
  context.globalCompositeOperation = 'source-over';
}

function _findObscuredActiveHeadSilhouetteCanvas(headImage:ImageBitmap, widthPixels:number, heightPixels:number):ScratchCanvas|null {
  const cacheKey = _calcObscuredActiveHeadCacheKey(widthPixels, heightPixels);
  const cachedCanvasesBySize = _obscuredActiveHeadSilhouetteCanvasCache.get(headImage) ?? new Map<string, ScratchCanvas>();
  const cachedCanvas = cachedCanvasesBySize.get(cacheKey) || null;
  if (cachedCanvas) return cachedCanvas;

  const silhouetteCanvas = createScratchCanvas(Math.max(1, Math.round(widthPixels)), Math.max(1, Math.round(heightPixels)));
  if (!silhouetteCanvas) return null;

  _renderObscuredActiveHeadSilhouetteCanvas(headImage, silhouetteCanvas);
  cachedCanvasesBySize.set(cacheKey, silhouetteCanvas);
  _obscuredActiveHeadSilhouetteCanvasCache.set(headImage, cachedCanvasesBySize);
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
  const [centerX, bottomY] = _getCharacterCanvasBottomPosition(displayPosition, scalingFactors);
  const swayPhase = ((time + character.randomSalt * CHARACTER_SWAY_INTERVAL) % CHARACTER_SWAY_INTERVAL) / CHARACTER_SWAY_INTERVAL;
  const sway = Math.sin(swayPhase * 2 * Math.PI) * CHARACTER_SWAY_AMOUNT;
  const pose = createBodyPose(character.rootBodyPart, character.bodyOrientation, character.facingDirection);
  const projected = createBodyCanvasLayout(pose, [centerX + sway, bottomY], scalingFactors, character.facingDirection);
  return {
    layout:projected,
    characterWidth:projected.bounds.width,
    characterHeight:projected.bounds.height,
    characterCenterCanvasPoint:[...projected.characterCenterCanvasPoint] as [number, number],
    anchorTopY:projected.anchorTopY
  };
}

export function getCharacterCanvasRect(character:Character, displayPosition:Position, scalingFactors:ScalingFactors,
  time:number, imageSet:ImageSet|null = null,
  characterCanvasLayout = createCharacterCanvasLayout(character, displayPosition, scalingFactors, time)):Rect {
  const { layout } = characterCanvasLayout;
  const bodyRect = layout.bounds;
  if (!imageSet) return bodyRect;
  const headImage = findImageBitmap(imageSet, getHeadImageUrl(character.rootBodyPart));
  const headRect = headImage
    ? calcHeadImageBounds(getResolvedBodyPart(layout.parts, 'head'), headImage.width, headImage.height,
      character.rootBodyPart.imageUrl !== null)
    : null;
  return headRect ? extendRectToContainRect(bodyRect, headRect) : bodyRect;
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
  const { layout, characterWidth, characterHeight } = createCharacterCanvasLayout(character, displayPosition, scalingFactors, time);
  const [centerX, centerY] = layout.characterCenterCanvasPoint;
  return { anchorX:layout.anchorX, anchorTopY:layout.anchorTopY, centerX, centerY, characterWidth, characterHeight };
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
  const headImage = findImageBitmap(imageSet, getHeadImageUrl(activeCharacter.rootBodyPart));

  context.save();
  context.translate(centerX, centerY);

  if (!headImage) {
    _drawObscuredActiveHeadFallback(0, 0, widthPixels, heightPixels, context);
    context.restore();
    return;
  }

  const silhouetteCanvas = _findObscuredActiveHeadSilhouetteCanvas(headImage, widthPixels, heightPixels);
  if (!silhouetteCanvas) {
    _drawObscuredActiveHeadFallback(0, 0, widthPixels, heightPixels, context);
    context.restore();
    return;
  }

  context.drawImage(silhouetteCanvas, -widthPixels / 2, -heightPixels / 2, widthPixels, heightPixels);
  context.restore();
}

export function drawCharacter(character:Character, displayPosition:Position, scalingFactors:ScalingFactors,
    context:CanvasRenderingContext2D, gameTime:number, imageSet:ImageSet, isHighlighted:boolean,
    metaTime:number, spriteOverrides:SpriteOverride[],
    characterCanvasLayout = createCharacterCanvasLayout(character, displayPosition, scalingFactors, gameTime)) {
  const { layout, characterWidth, characterHeight } = characterCanvasLayout;
  if (isHighlighted) _drawActiveCharacterHighlight(layout.head.centerX, layout.head.centerY, characterWidth, characterHeight, scalingFactors, context, metaTime);
  context.lineWidth = scalingFactors.roomLineWidth;
  context.strokeStyle = COLOR_BLACK;
  drawHeldItemsBehindCharacter(character, layout, scalingFactors, context, imageSet, spriteOverrides);
  getBodyPaintOrder(character.facingDirection, character.rootBodyPart.imageUrl !== null).forEach(kind => {
    const part = getResolvedBodyPart(layout.parts, kind);
    if (kind === 'head') {
      drawCharacterHead(part, character, imageSet, spriteOverrides, scalingFactors.roomLineWidth, context);
    } else {
      drawCharacterBodyPart(part, imageSet, spriteOverrides, context);
    }
  });
  drawHeldItemsInFrontOfCharacter(character, layout, scalingFactors, context, imageSet, spriteOverrides);
  if (DRAW_CHARACTER_DIAGNOSTICS) drawCharacterAttachmentMarkers(layout.parts, context);
}

export function drawCharacterPopover(character:Character, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D, time:number,
    imageSet:ImageSet, isTitleKnown:boolean, movingCharacterIds:ReadonlySet<string>,
    layoutPlanner:CanvasLayoutPlanner|null = null, room:Room|null = null) {
  if (!isCharacterInteractive(character)) return;
  const title = isTitleKnown ? _getCharacterDisplayName(character) : "";
  const displayLayout = room ? createRoomContentDisplayLayout(room, [character], movingCharacterIds) : null;
  const displayPosition = displayLayout?.characterLayoutById.get(character.id)?.displayPosition ?? character.position;
  drawPopover({ targetRect:getCharacterCanvasRect(character, displayPosition, scalingFactors, time, imageSet), title,
    bodyEntries:_createCharacterPopoverBodyEntries(character), scalingFactors, context, imageSet, layoutPlanner });
}
