/* v8 ignore file -- @preserve visual canvas drawing module with low contract-test value. */
/* This module groups item-focused drawing helpers, including item hit-testing and item popovers. */

import { clamp } from "@/common/numberUtil";
import { calcItemCuboidHeightPixels, calcItemCuboidWidthPixels } from "@/game/itemSizeUtil";
import { roomWidthToColumnCount } from "../waypointUtil";
import Rect from "../types/Rect";
import { canvasToGamePosition } from "./drawUtil";
import { COLOR_BLACK, COLOR_ITEM_FRONT_FILL, COLOR_ITEM_SIDE_FILL, COLOR_ITEM_TOP_FILL } from "./drawConstants";
import Item from "../types/Item";
import Room from "../types/Room";
import ScalingFactors from "../types/ScalingFactors";
import Effect from "../effects/types/Effect";
import EffectType from "../effects/types/EffectType";
import { drawTextPopover } from "./popoverDrawUtil";
import { calcPanelOffset, projectRoomPointWithDepth } from "./roomPanelProjectionUtil";
import { drawProjectedCuboid } from "./cuboidDrawUtil";

const ITEM_CUBOID_DEPTH_RATIO = 0.7;
const ITEM_CUBOID_LINE_WIDTH_RATIO = 0.25;

type ItemDrawMetrics = {
  cuboidWidthPixels:number,
  cuboidHeightPixels:number,
  cuboidDepthXPixels:number,
  cuboidDepthYPixels:number,
  cuboidLineWidthPixels:number
}

type RoomItemVisibilityOptions = {
  includeUndiscovered?:boolean,
  ignoreRoomObscured?:boolean
}

export function calcItemDrawMetrics(room:Room, scalingFactors:ScalingFactors):ItemDrawMetrics {
  const columnWidthGame = room.rect.width / roomWidthToColumnCount(room.rect.width);
  const columnWidthPixels = columnWidthGame * scalingFactors.scaleX;
  const [panelOffsetX, panelOffsetY] = calcPanelOffset(scalingFactors);
  const cuboidDepthXPixels = Math.max(2, panelOffsetX / 3 * ITEM_CUBOID_DEPTH_RATIO);
  const cuboidDepthYPixels = Math.max(1, panelOffsetY / 3 * ITEM_CUBOID_DEPTH_RATIO);
  const cuboidWidthPixels = calcItemCuboidWidthPixels(columnWidthPixels);
  const cuboidHeightPixels = calcItemCuboidHeightPixels(cuboidWidthPixels);
  return {
    cuboidWidthPixels,
    cuboidHeightPixels,
    cuboidDepthXPixels,
    cuboidDepthYPixels,
    cuboidLineWidthPixels:Math.max(0.5, scalingFactors.roomLineWidth * ITEM_CUBOID_LINE_WIDTH_RATIO)
  };
}

function _getRoomItemGamePosition(_room:Room, item:Item, scalingFactors:ScalingFactors):[number, number] {
  return canvasToGamePosition(...projectRoomPointWithDepth(item.position.x, item.position.y, item.position.z, scalingFactors), scalingFactors);
}

export function getItemCanvasPosition(item:Item, scalingFactors:ScalingFactors):[number, number] {
  return projectRoomPointWithDepth(item.position.x, item.position.y, clamp(item.position.z, 0, 1), scalingFactors);
}

export function getItemCanvasPositionInRoom(_room:Room, item:Item, scalingFactors:ScalingFactors):[number, number] {
  return projectRoomPointWithDepth(item.position.x, item.position.y, item.position.z, scalingFactors);
}

function _getItemHoverRect(room:Room, item:Item, scalingFactors:ScalingFactors):Rect {
  const metrics = calcItemDrawMetrics(room, scalingFactors);
  const hoverWidthPixels = metrics.cuboidWidthPixels + metrics.cuboidDepthXPixels;
  const topPixels = -(metrics.cuboidHeightPixels + metrics.cuboidDepthYPixels);
  const bottomPixels = 0;
  const [x, y] = _getRoomItemGamePosition(room, item, scalingFactors);
  return {
    x: x - (hoverWidthPixels / 2) / scalingFactors.scaleX,
    y: y + topPixels / scalingFactors.scaleY,
    width: hoverWidthPixels / scalingFactors.scaleX,
    height: (bottomPixels - topPixels) / scalingFactors.scaleY
  };
}

function drawItem(room:Room, item:Item, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const [x, y] = getItemCanvasPositionInRoom(room, item, scalingFactors);
  drawItemAtCanvasPosition(x, y, calcItemDrawMetrics(room, scalingFactors), context);
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
  drawProjectedCuboid({
    backTopLeft,
    backTopRight,
    backBottomLeft,
    frontTopLeft,
    frontTopRight,
    frontBottomLeft,
    frontBottomRight
  }, {
    topFillStyle:COLOR_ITEM_TOP_FILL,
    sideFillStyle:COLOR_ITEM_SIDE_FILL,
    frontFillStyle:COLOR_ITEM_FRONT_FILL,
    lineWidth:metrics.cuboidLineWidthPixels,
    strokeStyle:COLOR_BLACK
  }, context);
}

export function drawItemAtCanvasPosition(x:number, y:number, metrics:ItemDrawMetrics, context:CanvasRenderingContext2D) {
  context.save();
  _drawItemCuboid(x, y, metrics, context);
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
