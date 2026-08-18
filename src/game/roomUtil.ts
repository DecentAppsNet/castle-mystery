/* This module groups room lookup, visibility, containment, and room-to-character relationship helpers.
  Don't reference any data types specific to Level or GameState (including those types). This module is meant to serve 
  both level-loading and gameplay.
  Assertions are meant for debug errors.
  Lookup functions should return null, rather than throw.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import Rect from "./types/Rect";
import Room from "./types/Room";
import Character from "./types/Character";
import { normalizeId, normalizeOptionalId } from "./idUtil";
import { isPositionInRect } from "./rectUtil";

export function findRoom(rooms:readonly Room[], roomRef:string):Room|null {
  const roomId = normalizeId(roomRef);
  const room = rooms.find((r) => r.id === roomId);
  return room ?? null;
}

export function findRoomByIdOrTitle(rooms:readonly Room[], roomRef:string):Room|null {
  const roomId = normalizeId(roomRef);
  return rooms.find(room => room.id === roomId || normalizeOptionalId(room.title) === roomId) ?? null;
}

export function findRoomAtPosition(rooms:readonly Room[], x:number, y:number):Room|null {
  return rooms.find((r) => isPositionInRect(x, y, r.rect)) ?? null;
}

export function findRoomIdAtPosition(rooms:readonly Room[], x:number, y:number):string|null {
  const room = findRoomAtPosition(rooms, x, y);
  return room?.id ?? null;
}

export function findCharactersInRoom(room:Room, characters:readonly Character[]):Character[] {
  return characters.filter(c => isPositionInRect(c.position.x, c.position.y, room.rect));
}

export function calcRoomsBoundingRect(rooms:Room[]):Rect {
  if (!rooms.length) throw new Error('cannot calculate room bounds with no rooms');
  let leftX = rooms[0].rect.x, rightX = leftX + rooms[0].rect.width,
      topY = rooms[0].rect.y, bottomY = topY + rooms[0].rect.height;
  for (let i = 1; i < rooms.length; i++) {
    const room = rooms[i];
    leftX = Math.min(leftX, room.rect.x);
    rightX = Math.max(rightX, room.rect.x + room.rect.width);
    topY = Math.min(topY, room.rect.y);
    bottomY = Math.max(bottomY, room.rect.y + room.rect.height);
  }
  return {x:leftX, y:topY, width:rightX - leftX, height:bottomY - topY};
}