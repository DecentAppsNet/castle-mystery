/* v8 ignore file -- @preserve visual canvas drawing module with low contract-test value. */
/* This module groups item-focused drawing helpers, including item hit-testing and item popovers.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { clamp } from "@/common/numberUtil";
import CanvasLayoutPlanner from "@/game/CanvasLayoutPlanner";
import { calcItemCuboidHeightPixels, calcItemCuboidWidthPixels } from "@/game/itemSizeUtil";
import { isItemInteractive } from "@/game/interactivityUtil";
import { roomWidthToColumnCount } from "../waypointUtil";
import Rect from "../types/Rect";
import { canvasToGamePosition } from "./drawUtil";
import { COLOR_ITEM_POPOVER_HIGHLIGHT } from "./drawConstants";
import Item from "../types/Item";
import Room from "../types/Room";
import ScalingFactors from "../types/ScalingFactors";
import ImageSet from "../types/ImageSet";
import Effect from "../effects/types/Effect";
import EffectType from "../effects/types/EffectType";
import { drawPopover } from "./popoverDrawUtil";
import { calcPanelOffset, projectRoomPointWithDepth } from "./roomPanelProjectionUtil";
import { UNKNOWN_ITEM_ICON_URL } from "@/game/discoveryIconUrlUtil";
import { compareItemsForDrawOrder } from "./roomContentDrawOrderUtil";
import { assertNonNullable } from "decent-portal";

const ITEM_CUBOID_DEPTH_RATIO = 0.7;
const ITEM_CUBOID_LINE_WIDTH_RATIO = 0.25;
const PULSE_CADENCE_MS = 1000;
const PULSE_SCALE_PEAK = 1.08;
const ITEM_IMAGE_HIGHLIGHT_ALPHA_THRESHOLD = 16;
const ITEM_IMAGE_HIGHLIGHT_OUTSET_LINE_WIDTHS = .5;

const _itemImageHighlightSilhouetteCanvasCache = new WeakMap<ImageBitmap, Map<string, HTMLCanvasElement>>();

type ItemDrawMetrics = {
  cuboidWidthPixels:number,
  cuboidHeightPixels:number,
  cuboidDepthXPixels:number,
  cuboidDepthYPixels:number,
  cuboidLineWidthPixels:number,
  imageLeftOffsetPixels:number,
  imageTopOffsetPixels:number,
  imageWidthPixels:number,
  imageHeightPixels:number
}

type RoomItemVisibilityOptions = {
  includeUndiscovered?:boolean,
  ignoreRoomObscured?:boolean
}

type ItemImageRect = {
  leftOffsetPixels:number,
  topOffsetPixels:number,
  widthPixels:number,
  heightPixels:number
}

type ItemHighlightGlowMetrics = {
  glowWidth:number,
  glowBlur:number
}

function _calcItemImageColumnCount(image:ImageBitmap):number {
  return Math.max(1, Math.round(image.width / 256));
}

function _calcItemImageDrawWidthPixels(metrics:ItemDrawMetrics, image:ImageBitmap):number {
  return metrics.imageWidthPixels * _calcItemImageColumnCount(image);
}

function _calcItemImageLeftOffsetPixels(metrics:ItemDrawMetrics, image:ImageBitmap):number {
  const drawWidthPixels = _calcItemImageDrawWidthPixels(metrics, image);
  return metrics.imageLeftOffsetPixels - (drawWidthPixels - metrics.imageWidthPixels) / 2;
}

function _calcItemImageRect(metrics:ItemDrawMetrics, image:ImageBitmap):ItemImageRect {
  const widthPixels = _calcItemImageDrawWidthPixels(metrics, image);
  const heightPixels = widthPixels * image.height / image.width;
  return {
    leftOffsetPixels:_calcItemImageLeftOffsetPixels(metrics, image),
    topOffsetPixels:-heightPixels,
    widthPixels,
    heightPixels
  };
}

function _getItemDrawPosition(item:Item) {
  return {
    x:item.position.x + item.drawOffset.x,
    y:item.position.y + item.drawOffset.y,
    z:item.position.z + item.drawOffset.z
  };
}

export function calcItemDrawMetrics(room:Room, scalingFactors:ScalingFactors):ItemDrawMetrics {
  const columnWidthGame = room.rect.width / roomWidthToColumnCount(room.rect.width);
  const columnWidthPixels = columnWidthGame * scalingFactors.scaleX;
  const [panelOffsetX, panelOffsetY] = calcPanelOffset(scalingFactors);
  const cuboidDepthXPixels = Math.max(2, panelOffsetX / 3 * ITEM_CUBOID_DEPTH_RATIO);
  const cuboidDepthYPixels = Math.max(1, panelOffsetY / 3 * ITEM_CUBOID_DEPTH_RATIO);
  const cuboidWidthPixels = calcItemCuboidWidthPixels(columnWidthPixels);
  const cuboidHeightPixels = calcItemCuboidHeightPixels(cuboidWidthPixels);
  const imageLeftOffsetPixels = -(cuboidWidthPixels / 2 + cuboidDepthXPixels);
  const imageTopOffsetPixels = -(cuboidHeightPixels + cuboidDepthYPixels);
  return {
    cuboidWidthPixels,
    cuboidHeightPixels,
    cuboidDepthXPixels,
    cuboidDepthYPixels,
    cuboidLineWidthPixels:Math.max(0.5, scalingFactors.roomLineWidth * ITEM_CUBOID_LINE_WIDTH_RATIO),
    imageLeftOffsetPixels,
    imageTopOffsetPixels,
    imageWidthPixels:cuboidWidthPixels + cuboidDepthXPixels,
    imageHeightPixels:cuboidHeightPixels + cuboidDepthYPixels
  };
}

function _getRoomItemGamePosition(_room:Room, item:Item, scalingFactors:ScalingFactors):[number, number] {
  const drawPosition = _getItemDrawPosition(item);
  return canvasToGamePosition(...projectRoomPointWithDepth(drawPosition.x, drawPosition.y, drawPosition.z, scalingFactors), scalingFactors);
}

export function getItemCanvasPosition(item:Item, scalingFactors:ScalingFactors):[number, number] {
  const drawPosition = _getItemDrawPosition(item);
  return projectRoomPointWithDepth(drawPosition.x, drawPosition.y, clamp(drawPosition.z, 0, 1), scalingFactors);
}

export function getItemCanvasPositionInRoom(_room:Room, item:Item, scalingFactors:ScalingFactors):[number, number] {
  const drawPosition = _getItemDrawPosition(item);
  return projectRoomPointWithDepth(drawPosition.x, drawPosition.y, drawPosition.z, scalingFactors);
}

export function getItemCanvasRectInRoom(room:Room, item:Item, scalingFactors:ScalingFactors, imageSet:ImageSet):Rect {
  const metrics = calcItemDrawMetrics(room, scalingFactors);
  const [x, y] = getItemCanvasPositionInRoom(room, item, scalingFactors);
  const image = _findItemImage(item, imageSet);
  const imageRect = image ? _calcItemImageRect(metrics, image) : null;
  return {
    x:x + (imageRect?.leftOffsetPixels ?? metrics.imageLeftOffsetPixels),
    y:y + (imageRect?.topOffsetPixels ?? metrics.imageTopOffsetPixels),
    width:imageRect?.widthPixels ?? metrics.imageWidthPixels,
    height:imageRect?.heightPixels ?? metrics.imageHeightPixels
  };
}

function _getItemHoverRect(room:Room, item:Item, scalingFactors:ScalingFactors, imageSet:ImageSet):Rect {
  const image = _findItemImage(item, imageSet);
  if (!image) return {x:0, y:0, width:0, height:0}; // Headless call.
  const metrics = calcItemDrawMetrics(room, scalingFactors);
  const [x, y] = _getRoomItemGamePosition(room, item, scalingFactors);
  const imageRect = _calcItemImageRect(metrics, image);
  return {
    x: x + (imageRect.leftOffsetPixels ?? metrics.imageLeftOffsetPixels) / scalingFactors.scaleX,
    y: y + (imageRect.topOffsetPixels ?? metrics.imageTopOffsetPixels) / scalingFactors.scaleY,
    width: (imageRect.widthPixels ?? metrics.imageWidthPixels) / scalingFactors.scaleX,
    height: (imageRect.heightPixels ?? metrics.imageHeightPixels) / scalingFactors.scaleY
  };
}

function _findItemImage(item:Item, imageSet:ImageSet):ImageBitmap|null {
  const imageUrl = item.imageUrl ?? UNKNOWN_ITEM_ICON_URL;
  return imageSet.get(imageUrl) || null;
}

function _drawItemImage(image:ImageBitmap, x:number, y:number, metrics:ItemDrawMetrics, context:CanvasRenderingContext2D) {
  if (!image.width || !image.height) return;
  const imageRect = _calcItemImageRect(metrics, image);
  context.drawImage(
    image,
    x + imageRect.leftOffsetPixels,
    y + imageRect.topOffsetPixels,
    imageRect.widthPixels,
    imageRect.heightPixels
  );
}

function _calcItemHighlightGlowMetrics(metrics:ItemDrawMetrics, time:number):ItemHighlightGlowMetrics {
  const phase = (time % PULSE_CADENCE_MS) / PULSE_CADENCE_MS;
  const pulse = phase <= 0.5 ? phase * 2 : 2 * (1 - phase);
  const glowScale = 1 + (PULSE_SCALE_PEAK - 1) * pulse;
  const glowWidth = Math.max(2, metrics.cuboidLineWidthPixels * 6 * glowScale);
  return {
    glowWidth,
    glowBlur:glowWidth * 1.2
  };
}

function _calcItemImageHighlightCanvasKey(widthPixels:number, heightPixels:number):string {
  return `${Math.max(1, Math.round(widthPixels))}x${Math.max(1, Math.round(heightPixels))}`;
}

function _createItemImageHighlightSilhouetteCanvas(widthPixels:number, heightPixels:number):HTMLCanvasElement|null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(widthPixels));
  canvas.height = Math.max(1, Math.round(heightPixels));
  return canvas;
}

function _renderItemImageHighlightSilhouetteCanvas(image:ImageBitmap, silhouetteCanvas:HTMLCanvasElement) {
  const context = silhouetteCanvas.getContext("2d", { willReadFrequently:true });
  if (!context) return;
  context.clearRect(0, 0, silhouetteCanvas.width, silhouetteCanvas.height);
  context.drawImage(image, 0, 0, silhouetteCanvas.width, silhouetteCanvas.height);

  const imageData = context.getImageData(0, 0, silhouetteCanvas.width, silhouetteCanvas.height);
  for (let i = 0; i < imageData.data.length; i += 4) {
    imageData.data[i + 3] = imageData.data[i + 3] >= ITEM_IMAGE_HIGHLIGHT_ALPHA_THRESHOLD ? 255 : 0;
  }
  context.putImageData(imageData, 0, 0);
  context.globalCompositeOperation = "source-in";
  context.fillStyle = COLOR_ITEM_POPOVER_HIGHLIGHT;
  context.fillRect(0, 0, silhouetteCanvas.width, silhouetteCanvas.height);
  context.globalCompositeOperation = "source-over";
}

function _findItemImageHighlightSilhouetteCanvas(image:ImageBitmap, imageRect:ItemImageRect):HTMLCanvasElement|null {
  const cacheKey = _calcItemImageHighlightCanvasKey(imageRect.widthPixels, imageRect.heightPixels);
  const cachedCanvasesBySize = _itemImageHighlightSilhouetteCanvasCache.get(image) ?? new Map<string, HTMLCanvasElement>();
  const cachedCanvas = cachedCanvasesBySize.get(cacheKey) || null;
  if (cachedCanvas) return cachedCanvas;

  const silhouetteCanvas = _createItemImageHighlightSilhouetteCanvas(imageRect.widthPixels, imageRect.heightPixels);
  if (!silhouetteCanvas) return null;
  _renderItemImageHighlightSilhouetteCanvas(image, silhouetteCanvas);
  cachedCanvasesBySize.set(cacheKey, silhouetteCanvas);
  _itemImageHighlightSilhouetteCanvasCache.set(image, cachedCanvasesBySize);
  return silhouetteCanvas;
}

function _drawItemImageHighlight(image:ImageBitmap, x:number, y:number, metrics:ItemDrawMetrics,
  scalingFactors:ScalingFactors, context:CanvasRenderingContext2D, time:number) {
  if (!image.width || !image.height) return;
  const imageRect = _calcItemImageRect(metrics, image);
  const silhouetteCanvas = _findItemImageHighlightSilhouetteCanvas(image, imageRect);
  if (!silhouetteCanvas) return;
  const { glowWidth, glowBlur } = _calcItemHighlightGlowMetrics(metrics, time);
  const outsetPixels = scalingFactors.roomLineWidth * ITEM_IMAGE_HIGHLIGHT_OUTSET_LINE_WIDTHS;
  const highlightLeft = x + imageRect.leftOffsetPixels - outsetPixels;
  const highlightTop = y + imageRect.topOffsetPixels - outsetPixels;
  const highlightWidth = imageRect.widthPixels + outsetPixels * 2;
  const highlightHeight = imageRect.heightPixels + outsetPixels * 2;

  context.save();
  context.shadowColor = COLOR_ITEM_POPOVER_HIGHLIGHT;
  context.shadowBlur = glowBlur;
  context.drawImage(
    silhouetteCanvas,
    highlightLeft,
    highlightTop,
    highlightWidth,
    highlightHeight
  );

  context.shadowBlur = 0;
  context.globalAlpha = Math.min(1, Math.max(0.35, glowWidth / 10));
  context.drawImage(
    silhouetteCanvas,
    highlightLeft,
    highlightTop,
    highlightWidth,
    highlightHeight
  );
  context.restore();
}

function drawItem(room:Room, item:Item, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D,
  imageSet:ImageSet, isHighlighted:boolean = false, time:number = 0) {
  const image = _findItemImage(item, imageSet);
  if (!image) return; // Headless/test code call - no drawing needed.
  const [x, y] = getItemCanvasPositionInRoom(room, item, scalingFactors);
  const metrics = calcItemDrawMetrics(room, scalingFactors);
  context.save();
  if (isHighlighted) _drawItemImageHighlight(image, x, y, metrics, scalingFactors, context, time);
  _drawItemImage(image, x, y, metrics, context);
  context.restore();
}

export function drawRoomItem(room:Room, item:Item, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D,
  imageSet:ImageSet, isHighlighted:boolean = false, time:number = 0) {
  drawItem(room, item, scalingFactors, context, imageSet, isHighlighted, time);
}

export function drawItemAtCanvasPosition(item:Item, x:number, y:number, metrics:ItemDrawMetrics,
  context:CanvasRenderingContext2D, imageSet:ImageSet) {
  const image = _findItemImage(item, imageSet);
    if (!image) return; // Headless/test code call - no drawing needed.
  context.save();
  assertNonNullable(image);
  _drawItemImage(image, x, y, metrics, context);
  context.restore();
}

function _getVisibleItemsInDrawOrder(room:Room, effects:Effect[], includeUndiscovered:boolean):Item[] {
  return room.items
    .filter(item => item.isVisible && (includeUndiscovered || item.isDiscovered) && !_isItemSuppressedByEffect(item, effects))
    .sort(compareItemsForDrawOrder);
}

function _isItemSuppressedByEffect(item:Item, effects:Effect[]):boolean {
  return effects.some(effect => effect.type === EffectType.DROP_ITEM && "item" in effect && effect.item?.id === item.id);
}

export function findVisibleRoomItemsInDrawOrder(room:Room, effects:Effect[], includeUndiscovered:boolean):Item[] {
  return _getVisibleItemsInDrawOrder(room, effects, includeUndiscovered);
}

export function findDiscoveredItemAtPosition(room:Room, x:number, y:number, scalingFactors:ScalingFactors,
  imageSet:ImageSet, options:RoomItemVisibilityOptions = {}):Item|null {
  const { includeUndiscovered = false, ignoreRoomObscured = false } = options;
  if (room.isObscured && !ignoreRoomObscured) return null;
  const itemsInDrawOrder = _getVisibleItemsInDrawOrder(room, [], includeUndiscovered);
  for (let i = itemsInDrawOrder.length - 1; i >= 0; --i) {
    const item = itemsInDrawOrder[i];
    const rect = _getItemHoverRect(room, item, scalingFactors, imageSet);
    const isInside = x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
    if (isInside) return item;
  }
  return null;
}

export function drawItemPopover(room:Room, item:Item, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D,
  imageSet:ImageSet, layoutPlanner:CanvasLayoutPlanner|null = null) {
  if (!isItemInteractive(item)) return;
  drawPopover({
    targetRect:getItemCanvasRectInRoom(room, item, scalingFactors, imageSet),
    title:item.title,
    bodyEntries:[{ type:'imageTextRow', imageUrl:item.imageUrl || UNKNOWN_ITEM_ICON_URL, text:item.description, isDescriptionOnly:true }],
    scalingFactors,
    context,
    imageSet,
    layoutPlanner
  });
}