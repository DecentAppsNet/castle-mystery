/* This file resolves, validates, and applies shared room-exit lock and unlock activity scheduling.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { createKeyframeAtTime } from '@/game/timeline';
import { findRoomAtPosition } from '@/game/roomUtil';
import Effect from '@/game/effects/types/Effect';
import { ROOM_MIDDLE_ROW_CENTER_Z } from '@/game/roomSpaceConstants';
import CharacterKeyframe from '@/game/types/CharacterKeyframe';
import ExitStatus from '@/game/types/ExitStatus';
import ExitType from '@/game/types/ExitType';
import Level from '@/game/types/Level';
import Position from '@/game/types/Position';
import Room from '@/game/types/Room';
import RoomExit, { duplicateRoomExit, LOCKABLE_WITHOUT_INV_CHECK } from '@/game/types/RoomExit';
import RoomKeyframe from '@/game/types/RoomKeyframe';
import { ErrorCollector } from '@/levelLoading/errorCollection';
import Activity from '@/levelLoading/activityLoading/types/Activity';
import { addCharacterEffect, addRoomKeyChanges } from '@/levelLoading/timelineLoading';
import EditableTimeline from '@/levelLoading/timelineLoading/types/EditableTimeline';
import { assert, assertNonNullable } from 'decent-portal';

type LockabilityAction = 'lock'|'unlock';

type LockabilityContext = {
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
type LockabilityEffectFactory = (exitPosition:Position, startTime:number) => Effect;

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

function _createRoomExitsWithStatus(roomExits:RoomExit[], otherRoomId:string, nextStatus:ExitStatus):RoomExit[] {
  return roomExits.map(roomExit => {
    const exit = duplicateRoomExit(roomExit);
    if (exit.room1Id === otherRoomId || exit.room2Id === otherRoomId) exit.exitStatus = nextStatus;
    return exit;
  });
}

function _createRoomExitPosition(roomExit:RoomExit):Position {
  const { x, y } = roomExit;
  return { x, y, z:ROOM_MIDDLE_ROW_CENTER_Z };
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

/** Applies the exit state to both room snapshots and schedules its character effect. */
export function scheduleLockabilityChange(context:LockabilityContext, nextStatus:ExitStatus,
    createEffect:LockabilityEffectFactory, editableTimeline:EditableTimeline):number {
  const { activityStartTime, characterI, fromRoom, fromRoomI, fromRoomKeyframe, targetRoomId,
    targetRoomI, targetRoomKeyframe, targetRoomExit } = context;

  // Independently duplicate and update each room snapshot's own exit array.
  const targetRoomExits = _createRoomExitsWithStatus(targetRoomKeyframe.exits, fromRoom.id, nextStatus);
  const fromRoomExits = _createRoomExitsWithStatus(fromRoomKeyframe.exits, targetRoomId, nextStatus);
  addRoomKeyChanges({ exits:targetRoomExits }, targetRoomI, activityStartTime, editableTimeline);
  addRoomKeyChanges({ exits:fromRoomExits }, fromRoomI, activityStartTime, editableTimeline);

  // Attach the action-specific effect to the subject character.
  const effect = createEffect(_createRoomExitPosition(targetRoomExit), activityStartTime);
  addCharacterEffect(effect, characterI, editableTimeline);
  return effect.endTime;
}
