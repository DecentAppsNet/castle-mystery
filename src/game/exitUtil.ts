import ExitStatus from "./types/ExitStatus";
import ExitType from "./types/ExitType";
import Room from "./types/Room";
import RoomExit from "./types/RoomExit";

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

function _isLockableFromRoom1(exit:RoomExit):boolean {
  return exit.lockableFromRoom1With !== null;
}

function _isLockableFromRoom2(exit:RoomExit):boolean {
  return exit.lockableFromRoom2With !== null;
}

function _describeLockedLockableDoor(exit:RoomExit, room1:Room, room2:Room):string {
  const room1Reference = _describeRoomReference(exit, room1);
  const room2Reference = _describeRoomReference(exit, room2);
  if (_isLockableFromRoom1(exit) && _isLockableFromRoom2(exit)) return 'This locked door can be unlocked from either side with a key.';
  if (_isLockableFromRoom1(exit)) return `This locked door can be unlocked from ${room1Reference} with a key.`;
  if (_isLockableFromRoom2(exit)) return `This locked door can be unlocked from ${room2Reference} with a key.`;
  return `This locked door can't be unlocked. Weird.`;
}

function _describeUnlockedLockableDoor(exit:RoomExit, room1:Room, room2:Room):string {
  const room1Reference = _describeRoomReference(exit, room1);
  const room2Reference = _describeRoomReference(exit, room2);
  if (_isLockableFromRoom1(exit) && _isLockableFromRoom2(exit)) return 'This unlocked door can be locked from either side with a key.';
  if (_isLockableFromRoom1(exit)) return `This unlocked door can be locked from ${room1Reference} with a key.`;
  if (_isLockableFromRoom2(exit)) return `This unlocked door can be locked from ${room2Reference} with a key.`;
  return `This unlocked door can't be locked. Weird.`;
}

export function describeExit(exit:RoomExit, room1:Room, room2:Room):string {
  switch (exit.exitType) {
    case ExitType.doorway:
      return 'This doorway always remains open.';
    case ExitType.door:
      return "This door can't be locked but gives some privacy.";
    case ExitType.lockableDoor:
      return exit.exitStatus === ExitStatus.locked
        ? _describeLockedLockableDoor(exit, room1, room2)
        : _describeUnlockedLockableDoor(exit, room1, room2);
  }
}
