/* This file parses and schedules timestamp-constrained character positioning activities.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import Activity from "../types/Activity";
import { ErrorCollector } from "@/levelLoading/errorCollection";
import Level from "@/game/types/Level";
import ParseFormat from "../types/ParseFormat";
import { createParseFormat, makeIdentifier, makeLiteral, makeNumber, makeSequence, makeVerb } from "../parseFormatUtil";
import { assert, assertNonNullable } from "decent-portal";
import { findRoom, findRoomAtPosition } from "@/game/roomUtil";
import EditableTimeline from "@/levelLoading/timelineLoading/types/EditableTimeline";
import TimelineKeyframe from "@/game/types/TimelineKeyframe";
import Room from "@/game/types/Room";
import Position from "@/game/types/Position";
import { arePositionsEqual } from "@/game/positionUtil";
import Waypoint from "@/levelLoading/types/Waypoint";
import { ROOM_MIDDLE_ROW_CENTER_Z } from "@/game/roomSpaceConstants";
import { scheduleCharacterMovementToRoom, scheduleCharacterMovementToRoomAtTime } from "../movementPlanningUtil";
import { findNearestFloorWaypointToPosition, findNearestIncludedFloorWaypointToPosition, findWaypointsForRoom } from "../waypointFindingUtil";
import { createKeyframeAtTime } from "@/game/timeline";
import { findLatestKeyFrameForCharacter } from "@/levelLoading/timelineLoading/editingUtil";
import WaypointGenerationContext from "@/levelLoading/types/WaypointGenerationContext";

function _findClaimedWaypointsFromSnapshot(waypoints:Waypoint[], snapshot:TimelineKeyframe):Waypoint[] {
  const claimedWaypoints:Waypoint[] = [];
  for(let characterI = 0; characterI < snapshot.characters.length; ++characterI) {
    const characterPosition = snapshot.characters[characterI].position;
    const claimedWaypoint = waypoints.find(waypoint => arePositionsEqual(waypoint.position, characterPosition));
    if (claimedWaypoint) claimedWaypoints.push(claimedWaypoint);
  }
  return claimedWaypoints;
}

function _findBestTargetWaypoint(context:WaypointGenerationContext, waypoints:Waypoint[], claimedWaypoints:Waypoint[],
  targetRoom:Room, targetXPercent:number):Waypoint {
  const x = targetRoom.rect.x + (targetXPercent * targetRoom.rect.width);

  assert(waypoints.length > 0);

  const targetPosition = {x, y:0, z:ROOM_MIDDLE_ROW_CENTER_Z};
  let waypoint = findNearestIncludedFloorWaypointToPosition(context, targetRoom, targetPosition, claimedWaypoints); 
  if (waypoint) return waypoint;
  waypoint = findNearestFloorWaypointToPosition(context, targetRoom, targetPosition); // A crowded room. Just share a square with somebody else.
  assertNonNullable(waypoint, 'How can there be no available waypoints in the room?');
  return waypoint;
}

function _findTargetPosition(context:WaypointGenerationContext, snapshot:TimelineKeyframe, targetRoom:Room, targetXPercent:number = .5):Position {
  const waypoints = findWaypointsForRoom(context, targetRoom.id);
  const claimedWaypoints = _findClaimedWaypointsFromSnapshot(waypoints, snapshot);
  const bestWaypoint = _findBestTargetWaypoint(context, waypoints, claimedWaypoints, targetRoom, targetXPercent);
  return bestWaypoint.position;
}

type PartsShape = {
  characterId:string,
  roomId?:string,
  horizontalTarget?:number
}

const DEFAULT_HORIZONTAL_TARGET = .5;
/** Schedules a character to be at an authored position by the activity end time. */
export function scheduleAtActivity(level:Level, waypointContext:WaypointGenerationContext,
  activity:Activity, editableTimeline:EditableTimeline, errors:ErrorCollector):boolean {
  const { characterId, roomId, horizontalTarget } = activity.parts as PartsShape;
  assertNonNullable(characterId, 'implied subjects should have been resolved');
  const character = level.characters.find(c => c.id === characterId);
  assertNonNullable(character);
  
  if (!roomId && !horizontalTarget) {
    errors.addAtLine(`The @ activity needs room ID, horizontal target %, or both specified.`, activity.lineI);
    return false;
  }

  const characterI = editableTimeline.characterIdToI[characterId];
  const isRelativeTimestamp = activity.endTime === null;
  
  const fromKeyframe = findLatestKeyFrameForCharacter(editableTimeline, characterI);
  const fromPos = fromKeyframe.characters[characterI].position;
  const fromTime = fromKeyframe.time; // The very earliest that the character can begin moving toward destination.
  const fromFacingDirection = fromKeyframe.characters[characterI].facingDirection;
  const fromRoom = findRoomAtPosition(level.rooms, fromPos.x, fromPos.y);
  assertNonNullable(fromRoom);

  const toRoom = roomId === undefined ? fromRoom : findRoom(level.rooms, roomId);
  const horizontalPercent = horizontalTarget === undefined ? DEFAULT_HORIZONTAL_TARGET : horizontalTarget / 100;
  assertNonNullable(toRoom);

  const toKeyframe = isRelativeTimestamp 
    ? fromKeyframe
    : createKeyframeAtTime(editableTimeline.keyframes, activity.endTime!);
  const toPos = _findTargetPosition(waypointContext, toKeyframe, toRoom, horizontalPercent);

  /* If character is already in the room and no horizontal target was specified, then no movement needed. This isn't handled as an error, 
     because it can be useful for a level author to assert or self-document character position, e.g., "Sam @ Hall" means "I think Sam 
     should already be in the Hall". */
  if (fromRoom.id === toRoom.id && 
      // But if horizontal target was specified, same-room movement may still be needed.
      (horizontalTarget === undefined || arePositionsEqual(fromPos, toPos))) { // No movement needed.
    const endTime = isRelativeTimestamp ? fromTime : activity.endTime; // Use activity end time if available, because that can affect the timing of following activities.
    activity.startTime = activity.endTime = endTime;
    return true;
  }
  
  assert(activity.endTime === null || activity.endTime >= level.startTime);
  const toTime = toKeyframe.time;

  const scheduleResult = isRelativeTimestamp 
    ? scheduleCharacterMovementToRoom(waypointContext, fromRoom, fromPos, fromTime, toRoom, toPos, characterI, fromFacingDirection, editableTimeline)
    : scheduleCharacterMovementToRoomAtTime(waypointContext, fromRoom, fromPos, fromTime, toRoom, toPos, toTime, characterI, fromFacingDirection, editableTimeline)
  if (typeof scheduleResult === 'string') {
    errors.addAtLine(scheduleResult, activity.lineI);
    return false;
  }

  activity.startTime = fromTime + scheduleResult.walkStartDelay;
  activity.endTime = activity.startTime + scheduleResult.walkDuration;
  assert(isRelativeTimestamp || toTime === activity.endTime);
  return true;
}

/** Creates the accepted syntax for positioning activities. */
export function createAtActivityParseFormat():ParseFormat {
  const characterId = makeIdentifier('characterId', 'CharacterId', true);
  const at = makeVerb('@');
  const roomId = makeIdentifier('roomId', 'RoomId', true);
  const leftParen = makeLiteral('(');
  const horizontalTarget = makeNumber('horizontalTarget');
  const percent = makeLiteral('%');
  const rightParen = makeLiteral(')');
  const positionSequence = makeSequence([leftParen, horizontalTarget, percent, rightParen], true);
  const rootParseStep = makeSequence([characterId, at, roomId, positionSequence]);
  return createParseFormat(rootParseStep);
}