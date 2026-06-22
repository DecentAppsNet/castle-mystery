/* This module groups right-wall panel span helpers for deciding which room wall sections should render.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import Room from "./types/Room";
import { MAP_TILE_SIZE } from "./roomGridUtil";

type RightWallPanelSpan = Readonly<{
  topY:number,
  height:number
}>;

function _doesInsideRoomTouchRightWallStory(room:Room, rooms:ReadonlyArray<Room>, storyTopY:number, storyHeight:number):boolean {
  const rightWallX = room.rect.x + room.rect.width;
  const storyBottomY = storyTopY + storyHeight;
  return rooms.some(candidate => candidate.id !== room.id
    && !candidate.isOutside
    && candidate.rect.x === rightWallX
    && candidate.rect.y < storyBottomY
    && candidate.rect.y + candidate.rect.height > storyTopY);
}

export function findRightWallPanelSpans(room:Room, rooms:ReadonlyArray<Room>):RightWallPanelSpan[] {
  const roomBottomY = room.rect.y + room.rect.height;
  const spans:RightWallPanelSpan[] = [];
  let activeSpan:RightWallPanelSpan|null = null;

  for (let storyTopY = room.rect.y; storyTopY < roomBottomY; storyTopY += MAP_TILE_SIZE) {
    const storyHeight = Math.min(MAP_TILE_SIZE, roomBottomY - storyTopY);
    const shouldDrawStory = !room.isOutside || _doesInsideRoomTouchRightWallStory(room, rooms, storyTopY, storyHeight);

    if (!shouldDrawStory) {
      if (activeSpan) spans.push(activeSpan);
      activeSpan = null;
      continue;
    }

    if (activeSpan && activeSpan.topY + activeSpan.height === storyTopY) {
      activeSpan = { topY:activeSpan.topY, height:activeSpan.height + storyHeight };
      continue;
    }

    if (activeSpan) spans.push(activeSpan);
    activeSpan = { topY:storyTopY, height:storyHeight };
  }

  if (activeSpan) spans.push(activeSpan);
  return spans;
}