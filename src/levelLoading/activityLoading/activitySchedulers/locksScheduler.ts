/* This file parses and schedules room-exit locking activities.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import Level from "@/game/types/Level";
import { createParseFormat, makeIdentifier, makeSequence, makeVerb } from "../parseFormatUtil";
import ParseFormat from "../types/ParseFormat";
import Activity from "../types/Activity";
import EditableTimeline from "@/levelLoading/timelineLoading/types/EditableTimeline";
import { ErrorCollector } from "@/levelLoading/errorCollection";
import WaypointGenerationContext from "@/levelLoading/types/WaypointGenerationContext";
import RoomExit, { duplicateRoomExit } from "@/game/types/RoomExit";
import ExitStatus from "@/game/types/ExitStatus";
import { addCharacterEffect, addRoomKeyChanges } from "@/levelLoading/timelineLoading";
import { createLockEffect } from "@/game/effects/lockEffectUtil";
import { ROOM_MIDDLE_ROW_CENTER_Z } from "@/game/roomSpaceConstants";
import Position from "@/game/types/Position";
import { createLockabilityContext, validateLockabilityAction } from "./util/lockabilitySchedulingUtil";

/** Creates the accepted syntax for locking activities. */
export function createLocksParseFormat():ParseFormat {
  const characterId = makeIdentifier('characterId', 'CharacterId', true);
  const locks = makeVerb('locks');
  const roomId = makeIdentifier('roomId', 'RoomId');
  const rootParseStep = makeSequence([characterId, locks, roomId]);
  return createParseFormat(rootParseStep);
}

function _createRoomExitsWithLockedExit(roomExits:RoomExit[], targetRoomId:string):RoomExit[] {
  return roomExits.map(re => {
    const exit = duplicateRoomExit(re);
    if (exit.room1Id === targetRoomId || exit.room2Id === targetRoomId) exit.exitStatus = ExitStatus.locked;
    return exit;
  });
}

function _createRoomExitPosition(roomExit:RoomExit):Position {
  const { x, y } = roomExit;
  return { x, y, z:ROOM_MIDDLE_ROW_CENTER_Z };
}

/** Schedules an exit lock-state change into an editable timeline. */
export function scheduleLocksActivity(level:Level, _waypointContext:WaypointGenerationContext, activity:Activity, 
    editableTimeline:EditableTimeline, errors:ErrorCollector):boolean {

  const context = createLockabilityContext(level, activity, editableTimeline, errors, 'lock');
  if (!context) return false;
  if (!validateLockabilityAction(context, 'lock', ExitStatus.locked, errors, activity.lineI)) return false;
  const { activityStartTime, characterId, targetRoomId, characterI, fromRoom, fromRoomI,
    fromRoomKeyframe, targetRoomI, targetRoomKeyframe, targetRoomExit } = context;
  activity.busyCharacterIds = [characterId];

  // Add room exit key changes for the room character is in and the room that is being locked.
  const targetRoomExits = _createRoomExitsWithLockedExit(targetRoomKeyframe.exits, fromRoom.id);
  const fromRoomExits = _createRoomExitsWithLockedExit(fromRoomKeyframe.exits, targetRoomId);
  addRoomKeyChanges({ exits:targetRoomExits }, targetRoomI, activityStartTime, editableTimeline);
  addRoomKeyChanges({ exits:fromRoomExits }, fromRoomI, activityStartTime, editableTimeline);
  
  // Add effect to show locking.
  const targetRoomExitPosition = _createRoomExitPosition(targetRoomExit);
  const effect = createLockEffect(targetRoomExitPosition, activityStartTime);
  addCharacterEffect(effect, characterI, editableTimeline);

  activity.endTime = effect.endTime;
  return true;
}