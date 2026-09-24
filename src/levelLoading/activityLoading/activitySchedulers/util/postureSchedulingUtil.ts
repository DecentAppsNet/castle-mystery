/* This file schedules immediate or room-item-targeted character posture activities.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assert, assertNonNullable } from "decent-portal";

import { findRoomAtPosition } from "@/game/roomUtil";
import { createKeyframeAtTime } from "@/game/timeline";
import { BodyOrientation } from "@/game/types/Character";
import Level from "@/game/types/Level";
import { ErrorCollector } from "@/levelLoading/errorCollection";
import { addCharacterKeyChanges } from "@/levelLoading/timelineLoading";
import { scheduleCharacterMovementWithinRoom } from "@/levelLoading/activityLoading/movementPlanningUtil";
import { verbToPlainForm } from "@/levelLoading/activityLoading/parseFormatUtil";
import Activity from "@/levelLoading/activityLoading/types/Activity";
import EditableTimeline from "@/levelLoading/timelineLoading/types/EditableTimeline";
import WaypointGenerationContext from "@/levelLoading/types/WaypointGenerationContext";
import { findItemKeyframeLocation } from "./itemKeyframeLocationUtil";

/** Schedules a posture immediately or after movement to a captured room-item position. */
export function schedulePostureActivity(bodyOrientation:BodyOrientation, level:Level,
    waypointContext:WaypointGenerationContext, activity:Activity,
    editableTimeline:EditableTimeline, errors:ErrorCollector):boolean {
  const { characterId, targetItemId } = activity.parts as { characterId:string, targetItemId?:string };
  assertNonNullable(activity.startTime);
  const characterI = editableTimeline.characterIdToI[characterId];
  assertNonNullable(characterI);
  activity.busyCharacterIds = [characterId];
  activity.busyItemIds = [];

  // Apply targetless posture changes immediately.
  if (targetItemId === undefined) {
    addCharacterKeyChanges({ bodyOrientation }, characterI, activity.startTime, editableTimeline);
    activity.endTime = activity.startTime;
    return true;
  }

  // Capture the actor, room, and destination item from one interpolated start-time snapshot.
  const startKeyframe = createKeyframeAtTime(editableTimeline.keyframes, activity.startTime);
  const characterKeyframe = startKeyframe.characters[characterI];
  const room = findRoomAtPosition(level.rooms, characterKeyframe.position.x, characterKeyframe.position.y);
  assertNonNullable(room);
  const roomI = editableTimeline.roomIdToI[room.id];
  const roomItem = startKeyframe.rooms[roomI].items.find(item => item.id === targetItemId);
  if (!roomItem) {
    const location = findItemKeyframeLocation(startKeyframe, targetItemId);
    const action = verbToPlainForm(activity.verb);
    const message = location?.kind === 'room'
      ? `"${targetItemId}" item is in "${level.rooms[location.roomI].id}" room, not "${room.id}" room with "${characterId}" character.`
      : location
        ? `"${targetItemId}" item is owned by "${editableTimeline.characterIds[location.characterI]}" character, so can't be a ${action} destination.`
        : `"${targetItemId}" item is not in "${room.id}" room with "${characterId}" character.`;
    errors.addAtLine(message, activity.lineI);
    return false;
  }

  // Walk immediately, then apply non-standing requested postures at arrival.
  const result = scheduleCharacterMovementWithinRoom(waypointContext, room, characterKeyframe.position,
    activity.startTime, roomItem.position, characterI, characterKeyframe.facingDirection, editableTimeline);
  if (typeof result === 'string') {
    errors.addAtLine(result, activity.lineI);
    return false;
  }
  assert(result.walkStartDelay === 0);
  activity.endTime = activity.startTime + result.walkDuration;
  if (bodyOrientation !== 'standing') {
    addCharacterKeyChanges({ bodyOrientation }, characterI, activity.endTime, editableTimeline);
  }
  return true;
}