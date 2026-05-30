import { assertNonNullable } from "decent-portal";

import Rect from "./types/Rect";
import Room from "./types/Room";
import Character from "./types/Character";
import ExitStatus from "./types/ExitStatus";
import { normalizeId } from "./idUtil";
import { isPositionInOrOnRect, isPositionInRect } from "./rectUtil";

export function findRoom(rooms:Room[], roomRef:string):Room {
  const roomId = normalizeId(roomRef);
  const room = rooms.find((r) => r.id === roomId);
  if (!room) throw new Error(`room with id ${roomRef} not found`);
  return room;
}

export function findRoomAtPosition(rooms:Room[], x:number, y:number):Room | null {
  return rooms.find((r) => isPositionInRect(x, y, r.rect)) || null;
}

export function findRoomAtPositionOrTouchingBoundary(rooms:Room[], x:number, y:number):Room | null {
  return rooms.find((room) => isPositionInOrOnRect(x, y, room.rect)) || null;
}

export function findRoomNearestToPosition(rooms:Room[], x:number, y:number):Room {
  if (!rooms.length) throw new Error('there should be at least one room in the level');
  let nearestRoom:Room|null = null;
  let nearestDistanceSquared = Infinity;
  for (const room of rooms) {
    const centerX = room.rect.x + room.rect.width / 2;
    const centerY = room.rect.y + room.rect.height / 2;
    const distanceSquared = (centerX - x) ** 2 + (centerY - y) ** 2;
    if (distanceSquared < nearestDistanceSquared) {
      nearestRoom = room;
      nearestDistanceSquared = distanceSquared;
    }
  }
  assertNonNullable(nearestRoom, `unable to find nearest room for (${x}, ${y})`);
  return nearestRoom;
}

export function findCharactersInRoom(room:Room, characters:Character[]):Character[] {
  return characters.filter(character => isPositionInRect(character.x, character.y, room.rect));
}

export function isActiveAudibleRoom(room:Room, activeRoom:Room):boolean {
  if (room.id === activeRoom.id) return true;
  if (room.isObscured) return false;
  return room.exits.some(exit =>
    exit.exitStatus === ExitStatus.open
    && (exit.room1Id === activeRoom.id || exit.room2Id === activeRoom.id));
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