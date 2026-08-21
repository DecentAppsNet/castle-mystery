/* This module looks up item display positions from an explicitly calculated room-content layout.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { RoomContentDisplayLayout } from "./roomContentDisplayPositionUtil";
import Item from "./types/Item";
import Position from "./types/Position";

export function findItemDisplayPosition(item:Item, layout:RoomContentDisplayLayout|null):Position {
  const entry = layout?.itemLayoutById.get(item.id);
  if (entry) return entry.displayPosition;
  return {
    x:item.position.x + item.drawOffset.x,
    y:item.position.y + item.drawOffset.y,
    z:item.position.z + item.drawOffset.z
  };
}