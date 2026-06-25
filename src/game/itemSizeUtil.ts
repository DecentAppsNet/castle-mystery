/* This module groups shared item-size helpers used to convert item dimensions between game and canvas space.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import Room from "./types/Room";
import { roomWidthToColumnCount } from "./roomGridUtil";

const ITEM_CUBOID_WIDTH_RATIO = 0.68;
const ITEM_CUBOID_HEIGHT_RATIO = 0.55;

function _calcItemColumnWidthGame(room:Room):number {
  return room.rect.width / roomWidthToColumnCount(room.rect.width);
}

export function calcItemCuboidHeightGame(room:Room):number {
  return _calcItemColumnWidthGame(room) * ITEM_CUBOID_WIDTH_RATIO * ITEM_CUBOID_HEIGHT_RATIO;
}

export function calcItemCuboidWidthPixels(columnWidthPixels:number):number {
  return Math.max(4, columnWidthPixels * ITEM_CUBOID_WIDTH_RATIO);
}

export function calcItemCuboidHeightPixels(cuboidWidthPixels:number):number {
  return Math.max(4, cuboidWidthPixels * ITEM_CUBOID_HEIGHT_RATIO);
}