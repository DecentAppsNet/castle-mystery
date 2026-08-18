/* This module groups shared comparison and adjacency helpers for game-space positions.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { COLUMN_WIDTH, LAYER_HEIGHT } from "./roomGridUtil";
import { ROOM_BACK_ROW_CENTER_Z, ROOM_MIDDLE_ROW_CENTER_Z } from "./roomSpaceConstants";
import Position from "./types/Position";

const MAX_XZ_DISTANCE = Math.hypot(ROOM_BACK_ROW_CENTER_Z - ROOM_MIDDLE_ROW_CENTER_Z, COLUMN_WIDTH);

export function arePositionsEqual(a:Position, b:Position):boolean {
  return a.x === b.x && a.y === b.y && a.z === b.z;
}

export function arePositionsOrthogonal(a:Position, b:Position):boolean {
  let sameCount = 0;
  if (a.x === b.x) ++sameCount;
  if (a.y === b.y) ++sameCount;
  if (a.z === b.z) ++sameCount;
  return sameCount === 2;
}

// Two positions are considered adjacent if their Y values are <= one map tile height, and the XZ distance between
// them is same or equal to the distance of travelling diagonally from an adjacent row/column.
export function arePositionsAdjacent(a:Position, b:Position):boolean {
  if (Math.abs(a.y - b.y) > LAYER_HEIGHT) return false;
  const xzDistance = Math.hypot(a.x - b.x, a.z - b.z);
  return xzDistance <= MAX_XZ_DISTANCE;
}
