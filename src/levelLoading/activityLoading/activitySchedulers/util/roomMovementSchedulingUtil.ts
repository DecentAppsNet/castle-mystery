/* This file owns activity-level target and scheduling policy for room-directed character movement.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assert, assertNonNullable } from "decent-portal";

import Room from "@/game/types/Room";
import Position from "@/game/types/Position";
import { arePositionsEqual } from "@/game/types/Position";
import { ROOM_MIDDLE_ROW_CENTER_Z } from "@/game/roomSpaceConstants";
import TimelineKeyframe from "@/game/types/TimelineKeyframe";
import WaypointGenerationContext from "@/levelLoading/types/WaypointGenerationContext";
import Waypoint from "@/levelLoading/types/Waypoint";
import Activity from "@/levelLoading/activityLoading/types/Activity";
import { ErrorCollector } from "@/levelLoading/errorCollection";
import Level from "@/game/types/Level";
import EditableTimeline from "@/levelLoading/timelineLoading/types/EditableTimeline";
import { findRoom, findRoomAtPosition } from "@/game/roomUtil";
import { scheduleCharacterMovementToRoom } from "@/levelLoading/activityLoading/movementPlanningUtil";
import { createKeyframeAtTime } from "@/game/timeline";
import { findBestIncludedFloorWaypointToPosition, findNearestFloorWaypointToPosition, findWaypointsForRoom, isExitWaypoint, isWaypointOnMiddleRow } from "@/levelLoading/activityLoading/waypointFindingUtil";

function _findClaimedWaypoints(waypoints:Waypoint[], snapshot:TimelineKeyframe,
    ignoredCharacterI:number|null):Waypoint[] {
  return snapshot.characters.flatMap((character, characterI) => {
    if (characterI === ignoredCharacterI) return [];
    const waypoint = waypoints.find(candidate => character.isVisible && arePositionsEqual(candidate.position, character.position));
    return waypoint ? [waypoint] : [];
  });
}

function _findBestTargetWaypoint(context:WaypointGenerationContext, waypoints:Waypoint[], claimedWaypoints:Waypoint[],
    targetRoom:Room, targetPosition:Position):Waypoint {
  assert(waypoints.length > 0);

  // Prefer open middle-row positions away from items, then target the requested horizontal position.
  const waypoint = findBestIncludedFloorWaypointToPosition(context, targetRoom, claimedWaypoints, candidate => {
    let score = !isExitWaypoint(targetRoom, candidate) ? 1000000 : 0;
    if (isWaypointOnMiddleRow(candidate)) score += 100000;
    if (!targetRoom.items.some(item => arePositionsEqual(item.position, candidate.position))) score += 10000;
    return score + 1000 - Math.hypot(candidate.position.x - targetPosition.x, candidate.position.z - targetPosition.z);
  });
  if (waypoint) return waypoint;

  // A crowded room falls back to sharing the closest floor waypoint.
  const crowdedRoomWaypoint = findNearestFloorWaypointToPosition(context, targetRoom, targetPosition);
  assertNonNullable(crowdedRoomWaypoint, 'How can there be no available waypoints in the room?');
  return crowdedRoomWaypoint;
}
/** Finds the preferred room waypoint for a horizontal destination at a timeline snapshot. */
export function findRoomMovementTargetPosition(context:WaypointGenerationContext, snapshot:TimelineKeyframe,
    targetRoom:Room, horizontalTarget?:number, ignoredCharacterI:number|null = null):Position {
  const waypoints = findWaypointsForRoom(context, targetRoom.id);
  const targetXRatio = horizontalTarget === undefined ? .5 : horizontalTarget / 100;
  const targetPosition = { x:targetRoom.rect.x + targetXRatio * targetRoom.rect.width, y:0, z:ROOM_MIDDLE_ROW_CENTER_Z };
  const claimedWaypoints = _findClaimedWaypoints(waypoints, snapshot, ignoredCharacterI);

  return _findBestTargetWaypoint(context, waypoints, claimedWaypoints, targetRoom, targetPosition).position;
}

/** Schedules immediate room-directed movement from an activity's resolved start time. */
export function scheduleStartTimeRoomMovement(level:Level, waypointContext:WaypointGenerationContext,
    activity:Activity, editableTimeline:EditableTimeline, errors:ErrorCollector):boolean {
  const { characterId, roomId, horizontalTarget } = activity.parts as { characterId:string, roomId?:string, horizontalTarget?:number };
  assertNonNullable(characterId, 'implied subjects should have been resolved');
  activity.busyCharacterIds = [characterId];
  activity.busyItemIds = [];
  assertNonNullable(level.characters.find(character => character.id === characterId));

  if (!roomId && !horizontalTarget) {
    errors.addAtLine(`The ${activity.verb} activity needs room ID, horizontal target %, or both specified.`, activity.lineI);
    return false;
  }

  assert(activity.endTime === null);
  assertNonNullable(activity.startTime);
  const characterI = editableTimeline.characterIdToI[characterId];

  // Resolve the authored target from the character's position when movement begins.
  const fromKeyframe = createKeyframeAtTime(editableTimeline.keyframes, activity.startTime);
  const fromPosition = fromKeyframe.characters[characterI].position;
  const fromRoom = findRoomAtPosition(level.rooms, fromPosition.x, fromPosition.y);
  assertNonNullable(fromRoom);
  const toRoom = roomId === undefined ? fromRoom : findRoom(level.rooms, roomId);
  assertNonNullable(toRoom);
  const toPosition = findRoomMovementTargetPosition(waypointContext, fromKeyframe, toRoom, horizontalTarget);
  if (fromRoom.id === toRoom.id && (horizontalTarget === undefined || arePositionsEqual(fromPosition, toPosition))) {
    activity.endTime = activity.startTime;
    return true;
  }

  // Add movement keyframes immediately and retain its complete occupied interval.
  const walkDuration = scheduleCharacterMovementToRoom(waypointContext, fromRoom, fromPosition, activity.startTime,
    toRoom, toPosition, characterI, fromKeyframe.characters[characterI].facingDirection, editableTimeline);
  activity.endTime = activity.startTime + walkDuration;
  return true;
}