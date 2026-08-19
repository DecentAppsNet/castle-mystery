/* This module calculates structural positions for items added to room stacks.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { calcItemCuboidHeightGame } from "./itemSizeUtil";
import Item from "./types/Item";
import Position from "./types/Position";
import Room from "./types/Room";

export function findNextItemStackPosition(room:Room, targetPosition:Position, roomItems:readonly Item[]):Position {
  const stackedItems = roomItems.filter(item => item.position.x === targetPosition.x && item.position.z === targetPosition.z);
  const topItemY = stackedItems.reduce((topY, candidate) => Math.min(topY, candidate.position.y), targetPosition.y);
  return {
    x:targetPosition.x,
    y:stackedItems.length ? topItemY - calcItemCuboidHeightGame(room) : targetPosition.y,
    z:targetPosition.z
  };
}