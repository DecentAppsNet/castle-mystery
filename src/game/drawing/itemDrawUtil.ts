/* v8 ignore file -- @preserve visual canvas drawing module with low contract-test value. */
/* This module groups item-focused drawing helpers, including item hit-testing and item popovers.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { clamp } from "@/common/numberUtil";
import { calcItemCuboidHeightPixels, calcItemCuboidWidthPixels } from "@/game/itemSizeUtil";
import { isItemInteractive } from "@/game/interactivityUtil";
import { roomWidthToColumnCount } from "../waypointUtil";
import Rect from "../types/Rect";
import { canvasToGamePosition } from "./drawUtil";
import { COLOR_BLACK, COLOR_ITEM_POPOVER_HIGHLIGHT } from "./drawConstants";
import { interpolateColor } from "./colorUtil";
import Item from "../types/Item";
import Room from "../types/Room";
import ScalingFactors from "../types/ScalingFactors";
import ImageSet from "../types/ImageSet";
import Effect from "../effects/types/Effect";
import EffectType from "../effects/types/EffectType";
import { drawTextPopover } from "./popoverDrawUtil";
import { calcPanelOffset, projectRoomPointWithDepth } from "./roomPanelProjectionUtil";
import { drawProjectedCuboid } from "./cuboidDrawUtil";

const ITEM_CUBOID_DEPTH_RATIO = 0.7;
const ITEM_CUBOID_LINE_WIDTH_RATIO = 0.25;
const ITEM_LIGHT_BROWN = "#d6a06a";
const ITEM_DARK_BROWN = "#8b5a2b";
const ITEM_LIGHT_TOP_BROWN = "#e3b785";
const ITEM_DARK_TOP_BROWN = "#9f7242";
const ITEM_LIGHT_SIDE_BROWN = "#bd8650";
const ITEM_DARK_SIDE_BROWN = "#72461f";
const PULSE_CADENCE_MS = 1000;
const PULSE_SCALE_PEAK = 1.08;

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

type ItemCuboidPoints = {
  backTopLeft:[number, number],
  backTopRight:[number, number],
  backBottomLeft:[number, number],
  frontTopLeft:[number, number],
  frontTopRight:[number, number],
  frontBottomLeft:[number, number],
  frontBottomRight:[number, number]
}

type RoomItemVisibilityOptions = {
  includeUndiscovered?:boolean,
  ignoreRoomObscured?:boolean
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

function _calcItemImageRect(metrics:ItemDrawMetrics, image:ImageBitmap):{ leftOffsetPixels:number, topOffsetPixels:number, widthPixels:number, heightPixels:number } {
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
  const metrics = calcItemDrawMetrics(room, scalingFactors);
  const [x, y] = _getRoomItemGamePosition(room, item, scalingFactors);
  const image = _findItemImage(item, imageSet);
  const imageRect = image ? _calcItemImageRect(metrics, image) : null;
  return {
    x: x + (imageRect?.leftOffsetPixels ?? metrics.imageLeftOffsetPixels) / scalingFactors.scaleX,
    y: y + (imageRect?.topOffsetPixels ?? metrics.imageTopOffsetPixels) / scalingFactors.scaleY,
    width: (imageRect?.widthPixels ?? metrics.imageWidthPixels) / scalingFactors.scaleX,
    height: (imageRect?.heightPixels ?? metrics.imageHeightPixels) / scalingFactors.scaleY
  };
}

function _findItemImage(item:Item, imageSet:ImageSet):ImageBitmap|null {
  if (!item.imageUrl) return null;
  return imageSet.get(item.imageUrl) || null;
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

function _createItemCuboidPoints(x:number, y:number, metrics:ItemDrawMetrics):ItemCuboidPoints {
  const frontBottomLeft:[number, number] = [x - metrics.cuboidWidthPixels / 2, y];
  const frontBottomRight:[number, number] = [x + metrics.cuboidWidthPixels / 2, y];
  const frontTopLeft:[number, number] = [frontBottomLeft[0], y - metrics.cuboidHeightPixels];
  const frontTopRight:[number, number] = [frontBottomRight[0], y - metrics.cuboidHeightPixels];
  const backBottomLeft:[number, number] = [frontBottomLeft[0] - metrics.cuboidDepthXPixels, y - metrics.cuboidDepthYPixels];
  const backTopLeft:[number, number] = [backBottomLeft[0], backBottomLeft[1] - metrics.cuboidHeightPixels];
  const backTopRight:[number, number] = [frontTopRight[0] - metrics.cuboidDepthXPixels, frontTopRight[1] - metrics.cuboidDepthYPixels];
  return {
    backTopLeft,
    backTopRight,
    backBottomLeft,
    frontTopLeft,
    frontTopRight,
    frontBottomLeft,
    frontBottomRight
  };
}

function _traceItemSilhouettePath(points:ItemCuboidPoints, context:CanvasRenderingContext2D) {
  context.beginPath();
  context.moveTo(...points.backTopLeft);
  context.lineTo(...points.backTopRight);
  context.lineTo(...points.frontTopRight);
  context.lineTo(...points.frontBottomRight);
  context.lineTo(...points.frontBottomLeft);
  context.lineTo(...points.backBottomLeft);
  context.closePath();
}

function _drawItemHighlight(points:ItemCuboidPoints, metrics:ItemDrawMetrics, context:CanvasRenderingContext2D, time:number) {
  const phase = (time % PULSE_CADENCE_MS) / PULSE_CADENCE_MS;
  const pulse = phase <= 0.5 ? phase * 2 : 2 * (1 - phase);
  const glowScale = 1 + (PULSE_SCALE_PEAK - 1) * pulse;
  const glowWidth = Math.max(2, metrics.cuboidLineWidthPixels * 6 * glowScale);
  const glowBlur = glowWidth * 1.2;

  context.save();
  context.strokeStyle = COLOR_ITEM_POPOVER_HIGHLIGHT;
  context.shadowColor = COLOR_ITEM_POPOVER_HIGHLIGHT;
  context.shadowBlur = glowBlur;
  context.lineJoin = 'round';
  context.lineCap = 'round';
  context.lineWidth = glowWidth;
  _traceItemSilhouettePath(points, context);
  context.stroke();

  context.shadowBlur = 0;
  context.lineWidth = Math.max(1.5, glowWidth * 0.55);
  _traceItemSilhouettePath(points, context);
  context.stroke();
  context.restore();
}

function drawItem(room:Room, item:Item, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D,
  imageSet:ImageSet, isHighlighted:boolean = false, time:number = 0) {
  const [x, y] = getItemCanvasPositionInRoom(room, item, scalingFactors);
  const metrics = calcItemDrawMetrics(room, scalingFactors);
  const cuboidPoints = _createItemCuboidPoints(x, y, metrics);
  const image = _findItemImage(item, imageSet);
  context.save();
  if (isHighlighted) _drawItemHighlight(cuboidPoints, metrics, context, time);
  if (image) {
    _drawItemImage(image, x, y, metrics, context);
  } else {
    _drawItemCuboid(item, cuboidPoints, metrics, context);
  }
  context.restore();
}

export function drawRoomItem(room:Room, item:Item, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D,
  imageSet:ImageSet, isHighlighted:boolean = false, time:number = 0) {
  drawItem(room, item, scalingFactors, context, imageSet, isHighlighted, time);
}

function _drawItemCuboid(item:Item, points:ItemCuboidPoints, metrics:ItemDrawMetrics, context:CanvasRenderingContext2D) {
  const topFillStyle = interpolateColor(ITEM_LIGHT_TOP_BROWN, ITEM_DARK_TOP_BROWN, item.randomSalt);
  const sideFillStyle = interpolateColor(ITEM_LIGHT_SIDE_BROWN, ITEM_DARK_SIDE_BROWN, item.randomSalt);
  const frontFillStyle = interpolateColor(ITEM_LIGHT_BROWN, ITEM_DARK_BROWN, item.randomSalt);
  drawProjectedCuboid({
    backTopLeft:points.backTopLeft,
    backTopRight:points.backTopRight,
    backBottomLeft:points.backBottomLeft,
    frontTopLeft:points.frontTopLeft,
    frontTopRight:points.frontTopRight,
    frontBottomLeft:points.frontBottomLeft,
    frontBottomRight:points.frontBottomRight
  }, {
    topFillStyle,
    sideFillStyle,
    frontFillStyle,
    lineWidth:metrics.cuboidLineWidthPixels,
    strokeStyle:COLOR_BLACK
  }, context);
}

export function drawItemAtCanvasPosition(item:Item, x:number, y:number, metrics:ItemDrawMetrics,
  context:CanvasRenderingContext2D, imageSet:ImageSet) {
  context.save();
  const image = _findItemImage(item, imageSet);
  if (image) {
    _drawItemImage(image, x, y, metrics, context);
  } else {
    _drawItemCuboid(item, _createItemCuboidPoints(x, y, metrics), metrics, context);
  }
  context.restore();
}

function _getVisibleItemsInDrawOrder(room:Room, effects:Effect[], includeUndiscovered:boolean):Item[] {
  return room.items
    .filter(item => (includeUndiscovered || item.isDiscovered) && !_isItemSuppressedByEffect(item, effects))
    .sort((item1, item2) => item1.position.z - item2.position.z
      || item2.position.x - item1.position.x
      || item2.position.y - item1.position.y
      || item1.id.localeCompare(item2.id));
}

function _isItemSuppressedByEffect(item:Item, effects:Effect[]):boolean {
  return effects.some(effect => effect.type === EffectType.DROP_ITEM && "item" in effect && effect.item.id === item.id);
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

export function drawItemPopover(room:Room, item:Item, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D, imageSet:ImageSet) {
  if (!isItemInteractive(item)) return;
  drawTextPopover({ targetRect:getItemCanvasRectInRoom(room, item, scalingFactors, imageSet), title:item.title,
    bodyTexts:[item.description], scalingFactors, context });
}
