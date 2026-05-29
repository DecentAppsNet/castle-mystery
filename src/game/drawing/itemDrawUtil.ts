/* v8 ignore file -- @preserve visual canvas drawing module with low contract-test value. */
/* This module groups item-focused drawing helpers, including item labels, hover hit-testing, and item popovers. */

import { clamp } from "@/common/numberUtil";
import { roomWidthToColumnCount } from "../roomUtil";
import Rect from "../types/Rect";
import { gameToCanvasPosition } from "./drawUtil";
import { COLOR_BLACK } from "./drawConstants";
import Item from "../types/Item";
import Room from "../types/Room";
import ScalingFactors from "../types/ScalingFactors";
import Effect from "../effects/types/Effect";
import EffectType from "../effects/types/EffectType";
import { drawTextPopover } from "./popoverDrawUtil";
import { calcPanelOffset } from "./roomPanelDrawUtil";

const ITEM_LABEL_FONT_RATIO = 0.55;
const ITEM_CUBOID_COLOR = "#c58b57";
const ITEM_CUBOID_WIDTH_RATIO = 0.68;
const ITEM_CUBOID_HEIGHT_RATIO = 0.55;
const ITEM_CUBOID_DEPTH_RATIO = 0.7;
const ITEM_CUBOID_LINE_WIDTH_RATIO = 0.25;

type ItemDrawMetrics = {
  cuboidWidthPixels:number,
  cuboidHeightPixels:number,
  cuboidDepthXPixels:number,
  cuboidDepthYPixels:number,
  cuboidLineWidthPixels:number,
  labelFontSize:number,
  labelOffsetY:number
}

type RoomItemVisibilityOptions = {
  includeUndiscovered?:boolean,
  ignoreRoomObscured?:boolean
}

function _getItemLabelFontSize(scalingFactors:ScalingFactors):number {
  return Math.max(7, Math.round(scalingFactors.roomFontHeight * ITEM_LABEL_FONT_RATIO));
}

export function calcItemDrawMetrics(room:Room, scalingFactors:ScalingFactors):ItemDrawMetrics {
  const columnWidthGame = room.rect.width / roomWidthToColumnCount(room.rect.width);
  const columnWidthPixels = columnWidthGame * scalingFactors.scaleX;
  const [panelOffsetX, panelOffsetY] = calcPanelOffset(scalingFactors);
  const cuboidDepthXPixels = Math.max(2, panelOffsetX / 3 * ITEM_CUBOID_DEPTH_RATIO);
  const cuboidDepthYPixels = Math.max(1, panelOffsetY / 3 * ITEM_CUBOID_DEPTH_RATIO);
  const cuboidWidthPixels = Math.max(4, columnWidthPixels * ITEM_CUBOID_WIDTH_RATIO);
  const cuboidHeightPixels = Math.max(4, cuboidWidthPixels * ITEM_CUBOID_HEIGHT_RATIO);
  const labelFontSize = _getItemLabelFontSize(scalingFactors);
  return {
    cuboidWidthPixels,
    cuboidHeightPixels,
    cuboidDepthXPixels,
    cuboidDepthYPixels,
    cuboidLineWidthPixels:Math.max(0.5, scalingFactors.roomLineWidth * ITEM_CUBOID_LINE_WIDTH_RATIO),
    labelFontSize,
    labelOffsetY:-(cuboidHeightPixels + cuboidDepthYPixels + labelFontSize * 0.8)
  };
}

function _getApproxTextWidth(text:string, fontSize:number):number {
  return Math.max(fontSize, text.length * fontSize * 0.6);
}

function _getItemFrontDepth(item:Item):number {
  return Math.min(1, clamp(item.depth, 0, 1) + ITEM_CUBOID_LINE_WIDTH_RATIO + ITEM_CUBOID_DEPTH_RATIO / 3);
}

function _getRoomItemGamePosition(room:Room, item:Item, scalingFactors:ScalingFactors):[number, number] {
  const [offsetX, offsetY] = calcPanelOffset(scalingFactors);
  const frontDepth = _getItemFrontDepth(item);
  return [
    item.position.x + offsetX * frontDepth / scalingFactors.scaleX,
    room.rect.y + room.rect.height + offsetY * frontDepth / scalingFactors.scaleY
  ];
}

export function getItemCanvasPosition(item:Item, scalingFactors:ScalingFactors):[number, number] {
  const [x, y] = gameToCanvasPosition(item.position.x, item.position.y, scalingFactors);
  const [offsetX, offsetY] = calcPanelOffset(scalingFactors);
  const depth = clamp(item.depth, 0, 1);
  return [x + offsetX * depth, y + offsetY * depth];
}

export function getItemCanvasPositionInRoom(room:Room, item:Item, scalingFactors:ScalingFactors):[number, number] {
  const [x, y] = gameToCanvasPosition(item.position.x, room.rect.y + room.rect.height, scalingFactors);
  const [offsetX, offsetY] = calcPanelOffset(scalingFactors);
  const frontDepth = _getItemFrontDepth(item);
  return [x + offsetX * frontDepth, y + offsetY * frontDepth];
}

function _getItemHoverRect(room:Room, item:Item, scalingFactors:ScalingFactors):Rect {
  const metrics = calcItemDrawMetrics(room, scalingFactors);
  const hoverWidthPixels = Math.max(metrics.cuboidWidthPixels + metrics.cuboidDepthXPixels, _getApproxTextWidth(item.title, metrics.labelFontSize));
  const topPixels = item.isExamined ? metrics.labelOffsetY - metrics.labelFontSize * 0.8 : -(metrics.cuboidHeightPixels + metrics.cuboidDepthYPixels);
  const bottomPixels = 0;
  const [x, y] = _getRoomItemGamePosition(room, item, scalingFactors);
  return {
    x: x - (hoverWidthPixels / 2) / scalingFactors.scaleX,
    y: y + topPixels / scalingFactors.scaleY,
    width: hoverWidthPixels / scalingFactors.scaleX,
    height: (bottomPixels - topPixels) / scalingFactors.scaleY
  };
}

export function discoverVisibleItemsInRoom(room:Room) {
  if (room.isObscured) return [];
  const newlyDiscoveredItems:Item[] = [];
  room.items.forEach(item => {
    if (item.isDiscovered) return;
    item.isDiscovered = true;
    newlyDiscoveredItems.push(item);
  });
  return newlyDiscoveredItems;
}

function drawItem(room:Room, item:Item, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const [x, y] = getItemCanvasPositionInRoom(room, item, scalingFactors);
  drawItemAtCanvasPosition(item, x, y, calcItemDrawMetrics(room, scalingFactors), context);
}

export function drawRoomItem(room:Room, item:Item, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  drawItem(room, item, scalingFactors, context);
}

function _drawItemCuboid(x:number, y:number, metrics:ItemDrawMetrics, context:CanvasRenderingContext2D) {
  const frontBottomLeft:[number, number] = [x - metrics.cuboidWidthPixels / 2, y];
  const frontBottomRight:[number, number] = [x + metrics.cuboidWidthPixels / 2, y];
  const frontTopLeft:[number, number] = [frontBottomLeft[0], y - metrics.cuboidHeightPixels];
  const frontTopRight:[number, number] = [frontBottomRight[0], y - metrics.cuboidHeightPixels];
  const backBottomLeft:[number, number] = [frontBottomLeft[0] - metrics.cuboidDepthXPixels, y - metrics.cuboidDepthYPixels];
  const backTopLeft:[number, number] = [backBottomLeft[0], backBottomLeft[1] - metrics.cuboidHeightPixels];
  const backTopRight:[number, number] = [frontTopRight[0] - metrics.cuboidDepthXPixels, frontTopRight[1] - metrics.cuboidDepthYPixels];

  context.fillStyle = ITEM_CUBOID_COLOR;
  context.beginPath();
  context.moveTo(...backTopLeft);
  context.lineTo(...backTopRight);
  context.lineTo(...frontTopRight);
  context.lineTo(...frontTopLeft);
  context.closePath();
  context.fill();

  context.beginPath();
  context.moveTo(...backTopLeft);
  context.lineTo(...backBottomLeft);
  context.lineTo(...frontBottomLeft);
  context.lineTo(...frontTopLeft);
  context.closePath();
  context.fill();

  context.beginPath();
  context.moveTo(...frontTopLeft);
  context.lineTo(...frontTopRight);
  context.lineTo(...frontBottomRight);
  context.lineTo(...frontBottomLeft);
  context.closePath();
  context.fill();

  context.strokeStyle = COLOR_BLACK;
  context.lineWidth = metrics.cuboidLineWidthPixels;
  context.beginPath();
  context.moveTo(...backTopLeft);
  context.lineTo(...backTopRight);
  context.lineTo(...frontTopRight);
  context.lineTo(...frontBottomRight);
  context.lineTo(...frontBottomLeft);
  context.lineTo(...backBottomLeft);
  context.lineTo(...backTopLeft);
  context.moveTo(...frontTopLeft);
  context.lineTo(...frontTopRight);
  context.moveTo(...frontTopLeft);
  context.lineTo(...frontBottomLeft);
  context.moveTo(...backTopLeft);
  context.lineTo(...frontTopLeft);
  context.moveTo(...backTopRight);
  context.lineTo(...frontTopRight);
  context.stroke();
}

export function drawItemAtCanvasPosition(item:Item, x:number, y:number, metrics:ItemDrawMetrics, context:CanvasRenderingContext2D) {
  context.save();
  _drawItemCuboid(x, y, metrics, context);
  context.textAlign = "center";
  context.textBaseline = "middle";
  if (item.isExamined) {
    context.font = `${metrics.labelFontSize}px Jellee`;
    context.fillStyle = COLOR_BLACK;
    context.fillText(item.title, x + metrics.cuboidDepthXPixels / 2, y + metrics.labelOffsetY);
  }
  context.restore();
}

function _getVisibleItemsInDrawOrder(room:Room, effects:Effect[], includeUndiscovered:boolean):Item[] {
  return room.items
    .filter(item => (includeUndiscovered || item.isDiscovered) && !_isItemSuppressedByEffect(item, effects))
    .sort((item1, item2) => item1.depth - item2.depth || item2.position.x - item1.position.x || item1.id.localeCompare(item2.id));
}

function _isItemSuppressedByEffect(item:Item, effects:Effect[]):boolean {
  return effects.some(effect => effect.type === EffectType.DROP_ITEM && "item" in effect && effect.item.id === item.id);
}

export function findVisibleRoomItemsInDrawOrder(room:Room, effects:Effect[], includeUndiscovered:boolean):Item[] {
  return _getVisibleItemsInDrawOrder(room, effects, includeUndiscovered);
}

export function findDiscoveredItemAtPosition(room:Room, x:number, y:number, scalingFactors:ScalingFactors,
  options:RoomItemVisibilityOptions = {}):Item|null {
  const { includeUndiscovered = false, ignoreRoomObscured = false } = options;
  if (room.isObscured && !ignoreRoomObscured) return null;
  const itemsInDrawOrder = _getVisibleItemsInDrawOrder(room, [], includeUndiscovered);
  for (let i = itemsInDrawOrder.length - 1; i >= 0; --i) {
    const item = itemsInDrawOrder[i];
    const rect = _getItemHoverRect(room, item, scalingFactors);
    const isInside = x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
    if (isInside) return item;
  }
  return null;
}

export function drawItemPopover(room:Room, item:Item, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const [anchorX, anchorY] = getItemCanvasPositionInRoom(room, item, scalingFactors);
  drawTextPopover({ anchorX, anchorY, title:item.title, bodyTexts:[item.description], scalingFactors, context });
}
