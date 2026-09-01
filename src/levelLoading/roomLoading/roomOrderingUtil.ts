/* This file groups room-ordering helpers that derive a stable drawing order from room adjacency and layout.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import Room from "@/game/types/Room";

function _intersectRange(aStart:number, aEnd:number, bStart:number, bEnd:number): [number, number] | null {
  const start = Math.max(aStart, bStart);
  const end = Math.min(aEnd, bEnd);
  return end > start ? [start, end] : null;
}

function _sharesWallSectionToRight(room:Room, candidate:Room):boolean {
  if (candidate.rect.x !== room.rect.x + room.rect.width) return false;
  return !!_intersectRange(room.rect.y, room.rect.y + room.rect.height, candidate.rect.y, candidate.rect.y + candidate.rect.height);
}

function _sharesWallSectionBelow(room:Room, candidate:Room):boolean {
  if (candidate.rect.y !== room.rect.y + room.rect.height) return false;
  return !!_intersectRange(room.rect.x, room.rect.x + room.rect.width, candidate.rect.x, candidate.rect.x + candidate.rect.width);
}

function _findAdjacentRoomIdsToDrawBefore(room:Room, rooms:Room[]):Set<string> {
  const adjacentRoomIds = new Set<string>();
  rooms.forEach(candidate => {
    if (candidate.id === room.id) return;
    if (_sharesWallSectionToRight(room, candidate) || _sharesWallSectionBelow(room, candidate)) adjacentRoomIds.add(candidate.id);
  });
  return adjacentRoomIds;
}

function _compareRoomsForInitialOrder(room1:Room, room2:Room):number {
  return room2.rect.x - room1.rect.x || room1.rect.y - room2.rect.y;
}

/** Reports whether every room follows all rooms that must draw behind it. */
export function areRoomsWellOrdered(rooms:Room[]):boolean {
  for (let roomIndex = 0; roomIndex < rooms.length; ++roomIndex) {
    const room = rooms[roomIndex];
    const adjacentRoomIds = _findAdjacentRoomIdsToDrawBefore(room, rooms);
    for (let laterIndex = roomIndex + 1; laterIndex < rooms.length; ++laterIndex) {
      if (adjacentRoomIds.has(rooms[laterIndex].id)) return false;
    }
  }
  return true;
}

/** Returns rooms in a stable order satisfying adjacency-based drawing constraints. */
export function sortRoomsForDrawingOrder(rooms:Room[]):Room[] {
  const initialOrder = [...rooms].sort(_compareRoomsForInitialOrder);
  const sortedRooms = [...initialOrder];
  const maxPassCount = Math.max(1, rooms.length * rooms.length);
  for (let pass = 0; pass < maxPassCount && !areRoomsWellOrdered(sortedRooms); ++pass) {
    let movedAnyRoom = false;
    [...sortedRooms].forEach(room => {
      const currentIndex = sortedRooms.findIndex(candidate => candidate.id === room.id);
      if (currentIndex < 0) return;
      const adjacentRoomIds = _findAdjacentRoomIdsToDrawBefore(room, sortedRooms);
      let lastAdjacentIndex = -1;
      for (let laterIndex = currentIndex + 1; laterIndex < sortedRooms.length; ++laterIndex) {
        if (adjacentRoomIds.has(sortedRooms[laterIndex].id)) lastAdjacentIndex = laterIndex;
      }
      if (lastAdjacentIndex < 0) return;
      const [movedRoom] = sortedRooms.splice(currentIndex, 1);
      sortedRooms.splice(lastAdjacentIndex, 0, movedRoom);
      movedAnyRoom = true;
    });
    if (!movedAnyRoom) break;
  }
  return sortedRooms;
}