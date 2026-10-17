/* This file enumerates connected rooms crossed by scheduled horizontal movement.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assert, assertNonNullable } from "decent-portal";
import Position from "./types/Position";
import Room from "./types/Room";
import { areRoomsConnected, findRoomAtPosition } from "./roomUtil";

const RIGHT = 1, LEFT = -1;
type DIRECTION = 1|-1;
const INSIDE_LEFT_ROOM_OFFSET = .0001;

function _nextRoomX(room:Room, direction:DIRECTION):number {
  return direction === RIGHT
    ? room.rect.x + room.rect.width
    : room.rect.x - INSIDE_LEFT_ROOM_OFFSET; // The offset puts the X value inside the leftward room.
}

export function findCrossedRooms(fromPosition:Position, toPosition:Position, rooms:Room[], fromRoom:Room):Room[] {
  // Start at the first boundary in the movement direction.
  const direction = Math.sign(toPosition.x - fromPosition.x);
  assert(direction === LEFT || direction === RIGHT);
  const foundRooms:Room[] = [];
  let lastRoom:Room = fromRoom;
  let x = _nextRoomX(lastRoom, direction);
  let iterationCount = 0; // Shouldn't need to check, but infinite loops will hang a browser.

  // Follow connected rooms until the endpoint, retaining travel order.
  while((direction > 0 ? x <= toPosition.x : x >= toPosition.x) && ++iterationCount <= rooms.length) {
    const room = findRoomAtPosition(rooms, x, fromPosition.y);
    assertNonNullable(room);
    assert(areRoomsConnected(lastRoom, room)); // Earlier path generation should only have moved character through connected rooms.
    foundRooms.push(room);
    x = _nextRoomX(room, direction);
    lastRoom = room;
  }
  return foundRooms;
}