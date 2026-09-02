/* This file resolves shared scheduling context for room-exit lock and unlock activities.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { createKeyframeAtTime } from '@/game/timeline';
import { findRoomAtPosition } from '@/game/roomUtil';
import CharacterKeyframe from '@/game/types/CharacterKeyframe';
import ExitStatus from '@/game/types/ExitStatus';
import ExitType from '@/game/types/ExitType';
import Level from '@/game/types/Level';
import Room from '@/game/types/Room';
import RoomExit, { LOCKABLE_WITHOUT_INV_CHECK } from '@/game/types/RoomExit';
import RoomKeyframe from '@/game/types/RoomKeyframe';
import { ErrorCollector } from '@/levelLoading/errorCollection';
import EditableTimeline from '@/levelLoading/timelineLoading/types/EditableTimeline';
import { assert, assertNonNullable } from 'decent-portal';
import Activity from '../../types/Activity';

export type LockabilityAction = 'lock'|'unlock';

export type LockabilityContext = {
  activityStartTime:number,
  characterId:string,
  targetRoomId:string,
  characterI:number,
  characterKeyframe:CharacterKeyframe,
  fromRoom:Room,
  fromRoomI:number,
  fromRoomKeyframe:RoomKeyframe,
  targetRoomI:number,
  targetRoomKeyframe:RoomKeyframe,
  targetRoomExit:RoomExit
};

type PartsShape = { characterId:string, roomId:string };

function _findRoomExit(room:RoomKeyframe, targetRoomId:string):RoomExit|null {
  return room.exits.find(exit => exit.room1Id === targetRoomId || exit.room2Id === targetRoomId) ?? null;
}

function _doesCharacterHaveItem(characterKeyframe:CharacterKeyframe, itemId:string):boolean {
  return itemId === characterKeyframe.leftHandItem?.id || itemId === characterKeyframe.rightHandItem?.id ||
    characterKeyframe.items.some(item => item.id === itemId);
}

function _doesCharacterNeedItemForLockability(characterKeyframe:CharacterKeyframe, itemId:string):boolean {
  return itemId !== LOCKABLE_WITHOUT_INV_CHECK && !_doesCharacterHaveItem(characterKeyframe, itemId);
}

/** Resolves lock/unlock entities and reports expected authored room-targeting errors. */
export function createLockabilityContext(level:Level, activity:Activity, editableTimeline:EditableTimeline,
    errors:ErrorCollector, action:LockabilityAction):LockabilityContext|null {
  assertNonNullable(activity.startTime);
  const activityStartTime = activity.startTime;
  const { characterId, roomId:targetRoomId } = activity.parts as PartsShape;

  // Resolve the character and both room snapshots at activity start.
  const keyframe = createKeyframeAtTime(editableTimeline.keyframes, activityStartTime);
  const characterI = editableTimeline.characterIdToI[characterId];
  const characterKeyframe = keyframe.characters[characterI];
  assertNonNullable(characterKeyframe);
  const fromRoom = findRoomAtPosition(level.rooms, characterKeyframe.position.x, characterKeyframe.position.y);
  assertNonNullable(fromRoom);
  const fromRoomI = editableTimeline.roomIdToI[fromRoom.id];
  const fromRoomKeyframe = keyframe.rooms[fromRoomI];
  const targetRoomI = editableTimeline.roomIdToI[targetRoomId];
  const targetRoomKeyframe = keyframe.rooms[targetRoomI];
  assertNonNullable(fromRoomKeyframe);
  assertNonNullable(targetRoomKeyframe);

  // Reject targets that do not identify an adjacent room.
  if (fromRoom.id === targetRoomId) {
    errors.addAtLine(`Can't ${action} the same room "${targetRoomId}" that ${characterId} is in. Lock exits to adjacent rooms instead.`, activity.lineI);
    return null;
  }
  const targetRoomExit = _findRoomExit(fromRoomKeyframe, targetRoomId);
  if (!targetRoomExit) {
    errors.addAtLine(`Can't ${action} "${targetRoomId}" because it is not adjacent to "${fromRoom.id}" where ${characterId} is.`, activity.lineI);
    return null;
  }

  return { activityStartTime, characterId, targetRoomId, characterI, characterKeyframe, fromRoom, fromRoomI,
    fromRoomKeyframe, targetRoomI, targetRoomKeyframe, targetRoomExit };
}

/** Validates whether the resolved exit can perform the requested lockability action. */
export function validateLockabilityAction(context:LockabilityContext, action:LockabilityAction,
    nextStatus:ExitStatus, errors:ErrorCollector, lineI:number):boolean {
  const { characterId, characterKeyframe, targetRoomId, targetRoomExit } = context;

  // Require a lockable door that is not already in the requested state.
  if (targetRoomExit.exitType !== ExitType.lockableDoor) {
    errors.addAtLine(`Can't ${action} "${targetRoomId}" because its exit is not a lockable door.`, lineI);
    return false;
  }
  if (targetRoomExit.exitStatus === nextStatus) {
    errors.addAtLine(`Can't ${action} "${targetRoomId}" because its exit is already ${nextStatus}.`, lineI);
    return false;
  }
  assert(targetRoomExit.exitStatus === ExitStatus.locked || targetRoomExit.exitStatus === ExitStatus.unlocked);

  // Require operation permission from the character's side of the exit.
  const isTargetRoom1 = targetRoomExit.room1Id === targetRoomId;
  const lockableWith = isTargetRoom1 ? targetRoomExit.lockableFromRoom2With : targetRoomExit.lockableFromRoom1With;
  if (!lockableWith) {
    errors.addAtLine(`Can't ${action} "${targetRoomId}" because its exit is not lockable from the side ${characterId} is on.`, lineI);
    return false;
  }

  // Require the configured item unless the exit uses the no-inventory-check sentinel.
  if (_doesCharacterNeedItemForLockability(characterKeyframe, lockableWith)) {
    errors.addAtLine(`Can't ${action} "${targetRoomId}" because ${characterId} does not have "${lockableWith}" item.`, lineI);
    return false;
  }
  return true;
}
