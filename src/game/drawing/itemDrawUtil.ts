/* This module groups item-focused drawing helpers, including item labels, hover hit-testing, and item popovers. */

import Rect from "../types/Rect";
import { gameToCanvasPosition } from "./drawUtil";
import { COLOR_ITEM_TEXT } from "./drawConstants";
import Item from "../types/Item";
import Room from "../types/Room";
import ScalingFactors from "../types/ScalingFactors";
import Effect from "../effects/types/Effect";
import EffectType from "../effects/types/EffectType";
import { drawTextPopover } from "./popoverDrawUtil";

const ITEM_GLYPH_FONT_RATIO = 0.75;
const ITEM_LABEL_FONT_RATIO = 0.55;

type ItemDrawMetrics = {
  glyphFontSize:number,
  labelFontSize:number,
  labelOffsetY:number
}

type RoomItemVisibilityOptions = {
  includeUndiscovered?:boolean,
  ignoreRoomObscured?:boolean
}

function _getItemGlyphFontSize(scalingFactors:ScalingFactors):number {
  return Math.max(10, Math.round(scalingFactors.roomFontHeight * ITEM_GLYPH_FONT_RATIO));
}

function _getItemLabelFontSize(scalingFactors:ScalingFactors):number {
  return Math.max(7, Math.round(scalingFactors.roomFontHeight * ITEM_LABEL_FONT_RATIO));
}

function _getItemLabelOffsetY(scalingFactors:ScalingFactors):number {
  return _getItemGlyphFontSize(scalingFactors) * 0.7;
}

export function calcItemDrawMetrics(scalingFactors:ScalingFactors):ItemDrawMetrics {
  return {
    glyphFontSize:_getItemGlyphFontSize(scalingFactors),
    labelFontSize:_getItemLabelFontSize(scalingFactors),
    labelOffsetY:_getItemLabelOffsetY(scalingFactors)
  };
}

function _getApproxTextWidth(text:string, fontSize:number):number {
  return Math.max(fontSize, text.length * fontSize * 0.6);
}

function _getItemHoverRect(item:Item, scalingFactors:ScalingFactors):Rect {
  const glyphFontSize = _getItemGlyphFontSize(scalingFactors);
  const labelFontSize = _getItemLabelFontSize(scalingFactors);
  const labelOffsetY = _getItemLabelOffsetY(scalingFactors);
  const hoverWidthPixels = Math.max(glyphFontSize * 1.2, _getApproxTextWidth(item.title, labelFontSize));
  const topPixels = -glyphFontSize * 0.6;
  const bottomPixels = labelOffsetY + labelFontSize * 0.8;
  return {
    x: item.position.x - (hoverWidthPixels / 2) / scalingFactors.scaleX,
    y: item.position.y + topPixels / scalingFactors.scaleY,
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

function drawItem(item:Item, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const [x, y] = gameToCanvasPosition(item.position.x, item.position.y, scalingFactors);
  drawItemAtCanvasPosition(item, x, y, calcItemDrawMetrics(scalingFactors), context);
}

export function drawItemAtCanvasPosition(item:Item, x:number, y:number, metrics:ItemDrawMetrics, context:CanvasRenderingContext2D) {
  context.save();
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = COLOR_ITEM_TEXT;
  context.font = `${metrics.glyphFontSize}px Jellee`;
  context.fillText(item.displayChar, x, y);
  if (item.isExamined) {
    context.font = `${metrics.labelFontSize}px Jellee`;
    context.fillText(item.title, x, y + metrics.labelOffsetY);
  }
  context.restore();
}

function _isItemSuppressedByEffect(item:Item, effects:Effect[]):boolean {
  return effects.some(effect => effect.type === EffectType.DROP_ITEM && "item" in effect && effect.item.id === item.id);
}

export function drawDiscoveredItemsInRoom(room:Room, effects:Effect[], scalingFactors:ScalingFactors, context:CanvasRenderingContext2D,
  options:RoomItemVisibilityOptions = {}) {
  const { includeUndiscovered = false, ignoreRoomObscured = false } = options;
  if (room.isObscured && !ignoreRoomObscured) return;
  room.items
    .filter(item => (includeUndiscovered || item.isDiscovered) && !_isItemSuppressedByEffect(item, effects))
    .forEach(item => drawItem(item, scalingFactors, context));
}

export function findDiscoveredItemAtPosition(room:Room, x:number, y:number, scalingFactors:ScalingFactors,
  options:RoomItemVisibilityOptions = {}):Item|null {
  const { includeUndiscovered = false, ignoreRoomObscured = false } = options;
  if (room.isObscured && !ignoreRoomObscured) return null;
  for (let i = room.items.length - 1; i >= 0; --i) {
    const item = room.items[i];
    if (!includeUndiscovered && !item.isDiscovered) continue;
    const rect = _getItemHoverRect(item, scalingFactors);
    const isInside = x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
    if (isInside) return item;
  }
  return null;
}

export function drawItemPopover(item:Item, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const [anchorX, anchorY] = gameToCanvasPosition(item.position.x, item.position.y, scalingFactors);
  drawTextPopover({ anchorX, anchorY, title:item.title, bodyTexts:[item.description], scalingFactors, context });
}
