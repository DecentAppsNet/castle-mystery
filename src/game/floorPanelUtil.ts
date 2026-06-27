import Room from "./types/Room";
import { doesInsideRoomTouchVerticalSideSpan } from "./roomAdjacencyUtil";

export function shouldDrawFloorPanelLeftEdge(room:Room, rooms:ReadonlyArray<Room>):boolean {
  if (!room.isOutside) return true;
  return doesInsideRoomTouchVerticalSideSpan(room, rooms, 'left', room.rect.y, room.rect.height);
}

export function shouldDrawFloorPanelRightEdge(room:Room, rooms:ReadonlyArray<Room>):boolean {
  if (!room.isOutside) return true;
  return doesInsideRoomTouchVerticalSideSpan(room, rooms, 'right', room.rect.y, room.rect.height);
}