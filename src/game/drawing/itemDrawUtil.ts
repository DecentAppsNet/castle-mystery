/* v8 ignore file -- @preserve visual canvas drawing module with low contract-test value. */
/* This module groups item-focused drawing helpers, including item hit-testing and item popovers.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { clamp } from "@/common/numberUtil";
import CanvasLayoutPlanner from "@/game/CanvasLayoutPlanner";
import { findItemDisplayPosition } from "@/game/itemDisplayPositionUtil";
import { calcItemCuboidHeightPixels, calcItemCuboidWidthPixels } from "@/game/itemSizeUtil";
import { isItemInteractive } from "@/game/interactivityUtil";
import { roomWidthToColumnCount } from "../roomGridUtil";
import Rect from "../types/Rect";
import { canvasToGamePosition } from "./drawUtil";
import { COLOR_ITEM_POPOVER_HIGHLIGHT } from "./drawColorConstants";
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
import { drawUndiscoveredMarker } from "./undiscoveredMarkerDrawUtil";

const ITEM_SIZING_RATIO = 0.21;
const PULSE_CADENCE_MS = 1000;
const PULSE_SCALE_PEAK = 1.08;
const ITEM_IMAGE_HIGHLIGHT_ALPHA_THRESHOLD = 16;
const ITEM_IMAGE_HIGHLIGHT_OUTSET_LINE_WIDTHS = .5;

const _itemImageHighlightSilhouetteCanvasCache = new WeakMap<ImageBitmap, Map<string, HTMLCanvasElement>>();

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

// Converts shared image layout metrics into the final rectangle for one decoded image.
const IMAGE_PIXELS_PER_COLUMN = 256;
function _calcItemImageRect(itemDrawRect:ItemImageRect, image:ImageBitmap):ItemImageRect {
  /* Item images imply the number of columns that will be used to render them by their image width.
    In case some image is not exactly aligned with the pixel count per column, round up or down to nearest 
    column count. */
  const imageColumnCount = Math.max(1, Math.round(image.width / IMAGE_PIXELS_PER_COLUMN));

  const widthPixels = itemDrawRect.widthPixels * imageColumnCount; // Quantized to nearest column-aligned width.
  const leftOffsetPixels = itemDrawRect.leftOffsetPixels - (widthPixels - itemDrawRect.widthPixels) / 2;
  const heightPixels = widthPixels * image.height / image.width;
  return {
    leftOffsetPixels,
    topOffsetPixels:-heightPixels,
    widthPixels,
    heightPixels
  };
}

// Applies the item's authored draw offset before any world-to-canvas projection.
function _getItemDrawPosition(item:Item, room:Room|null = null) {
  return findItemDisplayPosition(item, room);
}

// Converts base item dimensions plus projection outsets into the canvas draw rect shape used by item images.
export function createItemDrawRect(baseWidthPixels:number, baseHeightPixels:number,
  projectionOutsetXPixels:number, projectionOutsetYPixels:number):ItemImageRect {
  return {
    leftOffsetPixels: -(baseWidthPixels / 2 + projectionOutsetXPixels),
    topOffsetPixels: -(baseHeightPixels + projectionOutsetYPixels),
    widthPixels: baseWidthPixels + projectionOutsetXPixels,
    heightPixels: baseHeightPixels + projectionOutsetYPixels
  };
}

export function calcItemDrawRect(room:Room, scalingFactors:ScalingFactors):ItemImageRect {
  const columnWidthGame = room.rect.width / roomWidthToColumnCount(room.rect.width);
  const columnWidthPixels = columnWidthGame * scalingFactors.scaleX;
  const baseWidthPixels = calcItemCuboidWidthPixels(columnWidthPixels);
  const baseHeightPixels = calcItemCuboidHeightPixels(baseWidthPixels);

  const [panelOffsetX, panelOffsetY] = calcPanelOffset(scalingFactors);
  const projectionOutsetXPixels = panelOffsetX * ITEM_SIZING_RATIO;
  const projectionOutsetYPixels = panelOffsetY * ITEM_SIZING_RATIO;

  return createItemDrawRect(baseWidthPixels, baseHeightPixels, projectionOutsetXPixels, projectionOutsetYPixels);
}

// Converts the item's projected canvas anchor back into game-space coordinates for hover math.
function _getRoomItemGamePosition(_room:Room, item:Item, scalingFactors:ScalingFactors):[number, number] {
  const drawPosition = _getItemDrawPosition(item, _room);
  return canvasToGamePosition(...projectRoomPointWithDepth(drawPosition.x, drawPosition.y, drawPosition.z, scalingFactors), scalingFactors);
}

// Projects an item using clamped depth for effect drawing outside a specific room context.
export function getItemCanvasPosition(item:Item, scalingFactors:ScalingFactors):[number, number] {
  const drawPosition = _getItemDrawPosition(item);
  return projectRoomPointWithDepth(drawPosition.x, drawPosition.y, clamp(drawPosition.z, 0, 1), scalingFactors);
}

// Projects an item to its anchor point on the room canvas using its authored room depth.
export function getItemCanvasPositionInRoom(_room:Room, item:Item, scalingFactors:ScalingFactors):[number, number] {
  const drawPosition = _getItemDrawPosition(item, _room);
  return projectRoomPointWithDepth(drawPosition.x, drawPosition.y, drawPosition.z, scalingFactors);
}

// Returns the canvas-space rectangle occupied by the item's image in a room.
export function getItemCanvasRectInRoom(room:Room, item:Item, scalingFactors:ScalingFactors, imageSet:ImageSet):Rect {
  const image = _findItemImage(item, imageSet);
  if (!image) return { x:0, y:0, width:0, height:0 }; // Headless.
  const itemDrawRect = calcItemDrawRect(room, scalingFactors);
  const [x, y] = getItemCanvasPositionInRoom(room, item, scalingFactors);
  const imageRect = _calcItemImageRect(itemDrawRect, image);
  return {
    x:x + imageRect.leftOffsetPixels,
    y:y + imageRect.topOffsetPixels,
    width:imageRect.widthPixels,
    height:imageRect.heightPixels
  };
}

// Returns the game-space hover rectangle for item hit-testing.
function _getItemHoverRect(room:Room, item:Item, scalingFactors:ScalingFactors, imageSet:ImageSet):Rect {
  const image = _findItemImage(item, imageSet);
  if (!image) return {x:0, y:0, width:0, height:0}; // Headless call.
  const itemDrawRect = calcItemDrawRect(room, scalingFactors);
  const [x, y] = _getRoomItemGamePosition(room, item, scalingFactors);
  const imageRect = _calcItemImageRect(itemDrawRect, image);
  return {
    x: x + (imageRect.leftOffsetPixels ?? itemDrawRect.leftOffsetPixels) / scalingFactors.scaleX,
    y: y + (imageRect.topOffsetPixels ?? itemDrawRect.topOffsetPixels) / scalingFactors.scaleY,
    width: (imageRect.widthPixels ?? itemDrawRect.widthPixels) / scalingFactors.scaleX,
    height: (imageRect.heightPixels ?? itemDrawRect.heightPixels) / scalingFactors.scaleY
  };
}

// Resolves the image to draw for an item, falling back to the unknown-item asset.
function _findItemImage(item:Item, imageSet:ImageSet):ImageBitmap|null {
  const imageUrl = item.imageUrl ?? UNKNOWN_ITEM_ICON_URL;
  return imageSet.get(imageUrl) || null;
}

// Draws an item image at the supplied projected anchor point.
function _drawItemImage(image:ImageBitmap, x:number, y:number, itemDrawRect:ItemImageRect, context:CanvasRenderingContext2D) {
  if (!image.width || !image.height) return;
  const imageRect = _calcItemImageRect(itemDrawRect, image);
  context.drawImage(
    image,
    x + imageRect.leftOffsetPixels,
    y + imageRect.topOffsetPixels,
    imageRect.widthPixels,
    imageRect.heightPixels
  );
}

// Computes the animated glow size used for hovered-item highlighting.
function _calcItemHighlightGlowMetrics(roomLineWidth:number, time:number):ItemHighlightGlowMetrics {
  const phase = (time % PULSE_CADENCE_MS) / PULSE_CADENCE_MS;
  const pulse = phase <= 0.5 ? phase * 2 : 2 * (1 - phase);
  const glowScale = 1 + (PULSE_SCALE_PEAK - 1) * pulse;
  const glowWidth = Math.max(2, roomLineWidth * glowScale);
  return {
    glowWidth,
    glowBlur:glowWidth * 1.2
  };
}

// Produces the cache key for a resized highlight silhouette canvas.
function _calcItemImageHighlightCanvasKey(widthPixels:number, heightPixels:number):string {
  return `${Math.max(1, Math.round(widthPixels))}x${Math.max(1, Math.round(heightPixels))}`;
}

// Allocates a canvas used to cache a single item-image highlight silhouette.
function _createItemImageHighlightSilhouetteCanvas(widthPixels:number, heightPixels:number):HTMLCanvasElement|null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(widthPixels));
  canvas.height = Math.max(1, Math.round(heightPixels));
  return canvas;
}

// Rasterizes a solid silhouette of an item image for glow highlighting.
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

// Looks up or creates the cached highlight silhouette for an item image size.
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

// Draws the pulsing hover highlight around an item image.
function _drawItemImageHighlight(image:ImageBitmap, x:number, y:number, itemDrawRect:ItemImageRect,
  scalingFactors:ScalingFactors, context:CanvasRenderingContext2D, time:number) {
  if (!image.width || !image.height) return;
  const imageRect = _calcItemImageRect(itemDrawRect, image);
  const silhouetteCanvas = _findItemImageHighlightSilhouetteCanvas(image, imageRect);
  if (!silhouetteCanvas) return;
  const { glowWidth, glowBlur } = _calcItemHighlightGlowMetrics(scalingFactors.roomLineWidth, time);
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

// Draws one room item, including its optional highlight effect.
function drawItem(room:Room, item:Item, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D,
  imageSet:ImageSet, isHighlighted:boolean = false, time:number = 0) {
  const image = _findItemImage(item, imageSet);
  if (!image) return; // Headless - no drawing needed.
  const [x, y] = getItemCanvasPositionInRoom(room, item, scalingFactors);
  const itemDrawRect = calcItemDrawRect(room, scalingFactors);
  const imageRect = _calcItemImageRect(itemDrawRect, image);
  context.save();
  if (isHighlighted) _drawItemImageHighlight(image, x, y, itemDrawRect, scalingFactors, context, time);
  _drawItemImage(image, x, y, itemDrawRect, context);
  if (isItemInteractive(item) && !item.isDiscovered) {
    drawUndiscoveredMarker(x, y + imageRect.topOffsetPixels, item.randomSalt, scalingFactors, context, time);
  }
  context.restore();
}

// Public room-item draw entry point used by room rendering.
export function drawRoomItem(room:Room, item:Item, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D,
  imageSet:ImageSet, isHighlighted:boolean = false, time:number = 0) {
  drawItem(room, item, scalingFactors, context, imageSet, isHighlighted, time);
}

// Draws an item at a caller-supplied canvas anchor using precomputed metrics.
export function drawItemAtCanvasPosition(item:Item, x:number, y:number, itemDrawRect:ItemImageRect,
  context:CanvasRenderingContext2D, imageSet:ImageSet) {
  const image = _findItemImage(item, imageSet);
  if (!image) return; // Headless/test code call - no drawing needed.
  context.save();
  _drawItemImage(image, x, y, itemDrawRect, context);
  context.restore();
}

// Draws an item at a caller-supplied canvas anchor using room-derived draw metrics.
export function drawItemAtCanvasPositionInRoom(item:Item, room:Room, x:number, y:number, scalingFactors:ScalingFactors,
  context:CanvasRenderingContext2D, imageSet:ImageSet) {
  drawItemAtCanvasPosition(item, x, y, calcItemDrawRect(room, scalingFactors), context, imageSet);
}

// Filters and sorts the room's visible items into draw order.
function _getVisibleItemsInDrawOrder(room:Room, effects:Effect[], includeUndiscovered:boolean):Item[] {
  return room.items
    .filter(item => item.isVisible && (includeUndiscovered || item.isDiscovered) && !_isItemSuppressedByEffect(item, effects))
    .sort(compareItemsForDrawOrder);
}

// Hides items that are currently represented by an active drop effect.
function _isItemSuppressedByEffect(item:Item, effects:Effect[]):boolean {
  return effects.some(effect => effect.type === EffectType.DROP_ITEM && "item" in effect && effect.item?.id === item.id);
}

// Exposes the room's visible items in the same order they should be drawn.
export function findVisibleRoomItemsInDrawOrder(room:Room, effects:Effect[], includeUndiscovered:boolean):Item[] {
  return _getVisibleItemsInDrawOrder(room, effects, includeUndiscovered);
}

// Finds the topmost discovered item under the pointer within one room.
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

// Draws the item popover anchored to the item's current image rectangle.
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