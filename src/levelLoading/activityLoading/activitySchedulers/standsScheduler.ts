/* This file parses and schedules character standing activities.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import Level from "@/game/types/Level";
import { createParseFormat, makeIdentifier, makeLiteralOptions, makeSequence, makeVerb } from "../parseFormatUtil";
import ParseFormat from "../types/ParseFormat";
import Activity from "../types/Activity";
import EditableTimeline from "@/levelLoading/timelineLoading/types/EditableTimeline";
import { ErrorCollector } from "@/levelLoading/errorCollection";
import { assert, assertNonNullable } from "decent-portal";
import { addCharacterKeyChanges } from "@/levelLoading/timelineLoading";
import WaypointGenerationContext from "@/levelLoading/types/WaypointGenerationContext";
import { createKeyframeAtTime } from "@/game/timeline";
import { findRoomAtPosition } from "@/game/roomUtil";
import { findItemKeyframeLocation } from "./util/itemKeyframeLocationUtil";
import { scheduleCharacterMovementWithinRoom } from "../movementPlanningUtil";

type StandsParts = { characterId:string, targetItemId?:string };

/** Creates the accepted syntax for standing activities. */
export function createStandsParseFormat():ParseFormat {
  const rootParseStep = makeSequence([
    makeIdentifier('characterId', 'CharacterId', true),
    makeVerb('stands'),
    makeSequence([ 
      makeLiteralOptions(['on', 'above', 'in', 'over', 'at']),
      makeIdentifier('targetItemId', 'ItemId')
    ], true)
  ]);
  return createParseFormat(rootParseStep);
}

/** Schedules a standing posture into an editable timeline. */
export function scheduleStandsActivity(level:Level, waypointContext:WaypointGenerationContext,
    activity:Activity, editableTimeline:EditableTimeline, errors:ErrorCollector):boolean {
  const { characterId, targetItemId } = activity.parts as StandsParts;
  assert(typeof characterId === 'string');
  assert(targetItemId === undefined || typeof targetItemId === 'string');
  assertNonNullable(activity.startTime);
  activity.busyCharacterIds = [characterId];
  activity.busyItemIds = [];

  const characterI = editableTimeline.characterIdToI[characterId];
  assertNonNullable(characterI);
  if (targetItemId === undefined) {
    addCharacterKeyChanges({ bodyOrientation:'standing'}, characterI, activity.startTime, editableTimeline);
    activity.endTime = activity.startTime;
    return true;
  }

  // Capture the actor, room, and destination item from one interpolated start-time snapshot.
  const startKeyframe = createKeyframeAtTime(editableTimeline.keyframes, activity.startTime);
  const characterKeyframe = startKeyframe.characters[characterI];
  assertNonNullable(characterKeyframe);
  const room = findRoomAtPosition(level.rooms, characterKeyframe.position.x, characterKeyframe.position.y);
  assertNonNullable(room);
  const roomI = editableTimeline.roomIdToI[room.id];
  assertNonNullable(roomI);
  const roomItem = startKeyframe.rooms[roomI].items.find(item => item.id === targetItemId);
  if (!roomItem) {
    const location = findItemKeyframeLocation(startKeyframe, targetItemId);
    if (location?.kind === 'room') {
      errors.addAtLine(`"${targetItemId}" item is in "${level.rooms[location.roomI].id}" room, not "${room.id}" room with "${characterId}" character.`, activity.lineI);
    } else if (location) {
      const ownerId = editableTimeline.characterIds[location.characterI];
      errors.addAtLine(`"${targetItemId}" item is owned by "${ownerId}" character, so can't be a stand destination.`, activity.lineI);
    } else {
      errors.addAtLine(`"${targetItemId}" item is not in "${room.id}" room with "${characterId}" character.`, activity.lineI);
    }
    return false;
  }

  // Start walking at the authored time and reserve only the actor through arrival.
  const scheduleResult = scheduleCharacterMovementWithinRoom(waypointContext, room,
    characterKeyframe.position, activity.startTime, roomItem.position, characterI,
    characterKeyframe.facingDirection, editableTimeline);
  if (typeof scheduleResult === 'string') {
    errors.addAtLine(scheduleResult, activity.lineI);
    return false;
  }
  assert(scheduleResult.walkStartDelay === 0);
  activity.endTime = activity.startTime + scheduleResult.walkDuration;
  return true;
}