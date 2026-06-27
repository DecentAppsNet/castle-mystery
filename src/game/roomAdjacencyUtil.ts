/* This module groups shared helpers for room-to-room adjacency relationships used by rendering and layout logic.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import Room from "./types/Room";

export function doesInsideRoomTouchVerticalSideSpan(room:Room, rooms:ReadonlyArray<Room>, side:'left'|'right', topY:number, height:number):boolean {
  const storyBottomY = topY + height;
  return rooms.some(candidate => candidate.id !== room.id
    && !candidate.isOutside
    && (side === 'left'
      ? candidate.rect.x + candidate.rect.width === room.rect.x
      : candidate.rect.x === room.rect.x + room.rect.width)
    && candidate.rect.y < storyBottomY
    && candidate.rect.y + candidate.rect.height > topY);
}