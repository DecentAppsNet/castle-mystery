import ExitStatus from "./types/ExitStatus";
import ExitType from "./types/ExitType";
import Room from "./types/Room";
import RoomExit from "./types/RoomExit";

export function createExitKey(exit:Pick<RoomExit, 'room1Id' | 'room2Id'>):string {
  return `${exit.room1Id}|${exit.room2Id}`;
}

function _findUndiscoveredRoomSideLabel(exit:RoomExit, room:Room):string {
  if (exit.y === room.rect.y) return "the south side";
  if (exit.y === room.rect.y + room.rect.height) return "the north side";
  if (exit.x === room.rect.x) return "the east side";
  if (exit.x === room.rect.x + room.rect.width) return "the west side";
  return "that side";
}

function _describeRoomReference(exit:RoomExit, room:Room):string {
  return room.isDiscovered ? room.title : _findUndiscoveredRoomSideLabel(exit, room);
}

function _describeLockedLockableDoor(exit:RoomExit, room1:Room, room2:Room):string {
  const room1Reference = _describeRoomReference(exit, room1);
  const room2Reference = _describeRoomReference(exit, room2);
  if (exit.isLockableFromRoom1 && exit.isLockableFromRoom2) return 'A locked door - it can be unlocked from either side with a key.';
  if (exit.isLockableFromRoom1) return `A locked door - it can be unlocked from ${room1Reference} with a key.`;
  if (exit.isLockableFromRoom2) return `A locked door - it can be unlocked from ${room2Reference} with a key.`;
  return 'A locked door - it can be unlocked from either side with a key.';
}

function _describeUnlockedLockableDoor(exit:RoomExit, room1:Room, room2:Room):string {
  const room1Reference = _describeRoomReference(exit, room1);
  const room2Reference = _describeRoomReference(exit, room2);
  if (exit.isLockableFromRoom1 && exit.isLockableFromRoom2) return 'An unlocked door - it can be locked from either side with a key.';
  if (exit.isLockableFromRoom1) return `An unlocked door - it can be locked from ${room1Reference} with a key.`;
  if (exit.isLockableFromRoom2) return `An unlocked door - it can be locked from ${room2Reference} with a key.`;
  return 'An unlocked door - it can be locked from either side with a key.';
}

export function describeExit(exit:RoomExit, room1:Room, room2:Room):string {
  switch (exit.exitType) {
    case ExitType.doorway:
      return 'A doorway - it always remains open.';
    case ExitType.door:
      return "A door - it can't be locked but gives some privacy.";
    case ExitType.lockableDoor:
      return exit.exitStatus === ExitStatus.locked
        ? _describeLockedLockableDoor(exit, room1, room2)
        : _describeUnlockedLockableDoor(exit, room1, room2);
  }
}
