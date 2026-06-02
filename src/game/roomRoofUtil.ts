/* This module groups room-roof bounding helpers used by camera framing and room rendering calculations.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import Rect from "./types/Rect";
import Room from "./types/Room";
import { MAP_TILE_SIZE } from "./roomGridUtil";

export const ROOF_APEX_Z = 0.5;
export const ROOF_PEAK_HEIGHT_RATIO = 0.2;

export type RoofTile = Readonly<{
  leftX:number,
  topY:number,
  width:number
}>;

export function calcRoofPeakHeight(roofWidth:number):number {
  return roofWidth * ROOF_PEAK_HEIGHT_RATIO;
}

function _doesRoomTouchRoofTileAbove(room:Room, rooms:ReadonlyArray<Room>, roofLeftX:number, roofWidth:number):boolean {
  const roofRightX = roofLeftX + roofWidth;
  return rooms.some(candidate => candidate.id !== room.id
    && !candidate.isOutside
    && candidate.rect.y + candidate.rect.height === room.rect.y
    && candidate.rect.x < roofRightX
    && candidate.rect.x + candidate.rect.width > roofLeftX);
}

export function findRoofTiles(room:Room, rooms:ReadonlyArray<Room>, groundFloorY:number = Infinity):RoofTile[] {
  if (room.isOutside || room.rect.y >= groundFloorY) return [];
  const roomRightX = room.rect.x + room.rect.width;
  const roofTiles:RoofTile[] = [];
  for (let roofLeftX = room.rect.x; roofLeftX < roomRightX; roofLeftX += MAP_TILE_SIZE) {
    const roofWidth = Math.min(MAP_TILE_SIZE, roomRightX - roofLeftX);
    if (_doesRoomTouchRoofTileAbove(room, rooms, roofLeftX, roofWidth)) continue;
    roofTiles.push({ leftX:roofLeftX, topY:room.rect.y, width:roofWidth });
  }
  return roofTiles;
}

export function calcRoomRoofBounds(room:Room, rooms:ReadonlyArray<Room>, groundFloorY:number = Infinity):Rect {
  const roofTiles = findRoofTiles(room, rooms, groundFloorY);
  const roofTopY = roofTiles.length
    ? Math.min(...roofTiles.map(tile => tile.topY - calcRoofPeakHeight(tile.width)))
    : room.rect.y;
  return {
    x:room.rect.x,
    y:roofTopY,
    width:room.rect.width,
    height:room.rect.y + room.rect.height - roofTopY
  };
}

export function calcRoomsBoundingRectWithRoofs(rooms:ReadonlyArray<Room>, groundFloorY:number = Infinity):Rect {
  if (!rooms.length) throw new Error('cannot calculate room bounds with no rooms');

  let leftX = rooms[0].rect.x;
  let rightX = leftX + rooms[0].rect.width;
  let topY = calcRoomRoofBounds(rooms[0], rooms, groundFloorY).y;
  let bottomY = rooms[0].rect.y + rooms[0].rect.height;

  for (let i = 1; i < rooms.length; ++i) {
    const roofBounds = calcRoomRoofBounds(rooms[i], rooms, groundFloorY);
    leftX = Math.min(leftX, roofBounds.x);
    rightX = Math.max(rightX, roofBounds.x + roofBounds.width);
    topY = Math.min(topY, roofBounds.y);
    bottomY = Math.max(bottomY, roofBounds.y + roofBounds.height);
  }

  return { x:leftX, y:topY, width:rightX - leftX, height:bottomY - topY };
}