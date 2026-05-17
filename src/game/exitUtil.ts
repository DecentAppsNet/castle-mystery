import ExitStatus from "./types/ExitStatus";
import ExitType from "./types/ExitType";
import RoomExit from "./types/RoomExit";

export function createExitKey(exit:Pick<RoomExit, 'room1Id' | 'room2Id'>):string {
  return `${exit.room1Id}|${exit.room2Id}`;
}

function _describeLockedLockableDoor(exit:RoomExit, room1Title:string, room2Title:string):string {
  if (exit.isLockableFromRoom1 && exit.isLockableFromRoom2) return 'A locked door - it can be unlocked from either side with a key.';
  if (exit.isLockableFromRoom1) return `A locked door - it can be unlocked from ${room1Title} with a key.`;
  if (exit.isLockableFromRoom2) return `A locked door - it can be unlocked from ${room2Title} with a key.`;
  return 'A locked door - it can be unlocked from either side with a key.';
}

function _describeUnlockedLockableDoor(exit:RoomExit, room1Title:string, room2Title:string):string {
  if (exit.isLockableFromRoom1 && exit.isLockableFromRoom2) return 'An unlocked door - it can be locked from either side with a key.';
  if (exit.isLockableFromRoom1) return `An unlocked door - it can be locked from ${room1Title} with a key.`;
  if (exit.isLockableFromRoom2) return `An unlocked door - it can be locked from ${room2Title} with a key.`;
  return 'An unlocked door - it can be locked from either side with a key.';
}

export function describeExit(exit:RoomExit, room1Title:string, room2Title:string):string {
  switch (exit.exitType) {
    case ExitType.doorway:
      return 'A doorway - it always remains open.';
    case ExitType.door:
      return "A door - it can't be locked but gives some privacy.";
    case ExitType.lockableDoor:
      return exit.exitStatus === ExitStatus.locked
        ? _describeLockedLockableDoor(exit, room1Title, room2Title)
        : _describeUnlockedLockableDoor(exit, room1Title, room2Title);
  }
}
