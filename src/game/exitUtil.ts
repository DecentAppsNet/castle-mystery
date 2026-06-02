/* This module groups exit-state query helpers used by gameplay, rendering, and room-audibility logic.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { assert } from "decent-portal";

import ExitStatus from "./types/ExitStatus";
import ExitType from "./types/ExitType";
import Item from "./types/Item";
import Room from "./types/Room";
import RoomExit, { LOCKABLE_WITHOUT_INV_CHECK } from "./types/RoomExit";

function _findUndiscoveredRoomSideLabel(exit:RoomExit, room:Room):string {
  if (exit.x === room.rect.x) return "the right side";
  assert(exit.x === room.rect.x + room.rect.width); 
  return "the left side";
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

function _describeOptionalUnlockItem(lockableWith:string|null, itemsById:ReadonlyMap<string, Item>):string|null {
  if (lockableWith === null || lockableWith === LOCKABLE_WITHOUT_INV_CHECK) return null;
  return itemsById.get(lockableWith)?.title || lockableWith;
}

function _formatLockabilitySuffix(lockableWith:string|null, itemsById:ReadonlyMap<string, Item>):string {
  const unlockItem = _describeOptionalUnlockItem(lockableWith, itemsById);
  return unlockItem ? ` with ${unlockItem}` : '';
}

function _describeLockedLockableDoor(exit:RoomExit, room1:Room, room2:Room, itemsById:ReadonlyMap<string, Item>):string {
  const room1Reference = _describeRoomReference(exit, room1);
  const room2Reference = _describeRoomReference(exit, room2);
  if (_isLockableFromRoom1(exit) && _isLockableFromRoom2(exit)) {
    return `This locked door can be unlocked from either side${_formatLockabilitySuffix(exit.lockableFromRoom1With, itemsById)}.`;
  }
  if (_isLockableFromRoom1(exit)) return `This locked door can be unlocked from ${room1Reference}${_formatLockabilitySuffix(exit.lockableFromRoom1With, itemsById)}.`;
  if (_isLockableFromRoom2(exit)) return `This locked door can be unlocked from ${room2Reference}${_formatLockabilitySuffix(exit.lockableFromRoom2With, itemsById)}.`;
  return `This locked door can't be unlocked. Weird.`;
}

function _describeUnlockedLockableDoor(exit:RoomExit, room1:Room, room2:Room, itemsById:ReadonlyMap<string, Item>):string {
  const room1Reference = _describeRoomReference(exit, room1);
  const room2Reference = _describeRoomReference(exit, room2);
  if (_isLockableFromRoom1(exit) && _isLockableFromRoom2(exit)) {
    return `This unlocked door can be locked from either side${_formatLockabilitySuffix(exit.lockableFromRoom1With, itemsById)}.`;
  }
  if (_isLockableFromRoom1(exit)) return `This unlocked door can be locked from ${room1Reference}${_formatLockabilitySuffix(exit.lockableFromRoom1With, itemsById)}.`;
  if (_isLockableFromRoom2(exit)) return `This unlocked door can be locked from ${room2Reference}${_formatLockabilitySuffix(exit.lockableFromRoom2With, itemsById)}.`;
  return `This unlocked door can't be locked. Weird.`;
}

export function describeExit(exit:RoomExit, room1:Room, room2:Room, itemsById:ReadonlyMap<string, Item>):string {
  switch (exit.exitType) {
    case ExitType.doorway:
      return 'This doorway always remains open.';
    case ExitType.door:
      return "This door can't be locked but gives some privacy.";
    case ExitType.lockableDoor:
      return exit.exitStatus === ExitStatus.locked
        ? _describeLockedLockableDoor(exit, room1, room2, itemsById)
        : _describeUnlockedLockableDoor(exit, room1, room2, itemsById);
  }
}
