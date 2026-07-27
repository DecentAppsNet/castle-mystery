

/*
export function tryCreateAtActivity(activityText:string, context:ActivityContext):ItineraryEvent[]|null {
  const trimmedActivityText = activityText.trim();
  if (!trimmedActivityText.startsWith('@')) return null;

  ensureTimestampIsAvailable(context.state, context.timestamp, activityText, context.timestampType);
  const activityStartTime = calcActivityStartTime(context.state, context.timestamp, context.timestampType);
  const { roomId:targetRoomId, targetXPercent } = _parseAtTarget(trimmedActivityText, context);
  if (findCurrentRoomForWaypoint(context.level, context.state.waypoint).id === targetRoomId && targetXPercent === null) return [];
  const occupiedWaypointKeys = _createClaimedWaypointKeysForTargetRoom(targetRoomId, context);
  const unscheduledEvents = planMovementToRoom(context.level, context.state.waypoint, targetRoomId, occupiedWaypointKeys, null, targetXPercent);
  const targetRoomTitle = context.level.rooms.find(room => room.id === targetRoomId)?.title || targetRoomId;
  const scheduledEvents = context.timestampType === 'absolute'
    ? scheduleEventsToEndAtTime(unscheduledEvents, context.timestamp, findEarliestAbsoluteActivityStartTime(context.state), earliestArrivalTime =>
      `Unable to arrive to ${targetRoomTitle} by ${formatMsecsAsTimestamp(context.timestamp)}. The earliest possible arrival is ${formatMsecsAsTimestamp(earliestArrivalTime)}.`)
    : scheduleEventsToStartAtTime(unscheduledEvents, activityStartTime, context.state.time);
  return scheduledEvents;
}
*/

import Activity from "../types/Activity";
import ErrorCollector from "@/levelLoading2/errorCollection/ErrorCollector";
import Level from "@/game/types/Level";
import ParseFormat from "../types/ParseFormat";
import { createParseFormat, makeIdentifier, makeSequence, makeVerb } from "../parseFormatUtil";
import { assert, assertNonNullable } from "decent-portal";
import { findRoom } from "@/game/roomUtil";
import EditableItinerary from "@/levelLoading2/itineraryLoading/types/EditableItinerary";
import { createSnapshotAtTime } from "@/levelLoading2/itineraryLoading/retrievalUtil";
import ItineraryKeyframe from "@/levelLoading2/itineraryLoading/types/ItineraryKeyframe";
import Room from "@/game/types/Room";
import Position, { arePositionsEqual } from "@/game/types/Position";
import Waypoint from "@/game/types/Waypoint";
import { ROOM_MIDDLE_ROW_CENTER_Z } from "@/game/roomSpaceConstants";
import { clamp } from "@/common/numberUtil";

function _findClaimedWaypoints(waypoints:Waypoint[], snapshot:ItineraryKeyframe):Waypoint[] {
  const claimedWaypoints:Waypoint[] = [];
  for(let characterI = 0; characterI < snapshot.characters.length; ++characterI) {
    const characterPosition = snapshot.characters[characterI].position;
    const claimedWaypoint = waypoints.find(waypoint => arePositionsEqual(waypoint.position, characterPosition));
    if (claimedWaypoint) claimedWaypoints.push(claimedWaypoint);
  }
  return claimedWaypoints;
}

function _isMiddleRowWaypoint(waypoint:Waypoint):boolean {
  return waypoint.position.z === ROOM_MIDDLE_ROW_CENTER_Z
}

function _isGroundFloorWaypoint(waypoint:Waypoint, room:Room):boolean {
  return waypoint.position.y === room.rect.y + room.rect.height;
}

function _findBestTargetWaypoint(waypoints:Waypoint[], claimedWaypoints:Waypoint[], targetRoom:Room, targetXPercent:number):Waypoint {
  const targetX = targetRoom.rect.x + (targetXPercent * targetRoom.rect.width);

  assert(waypoints.length > 0);

  let bestScore = -Infinity;
  let bestWaypoint = null;
  for(let waypointI = 0; waypointI < waypoints.length; ++waypointI) {
    const waypoint = waypoints[waypointI];
    let score = 0;
    if (_isGroundFloorWaypoint(waypoint, targetRoom)) score += 100000;
    if (!claimedWaypoints.includes(waypoint)) score += 10000;
    if (_isMiddleRowWaypoint(waypoint)) score += 1000;
    score += clamp(Math.abs(waypoint.position.x - targetX), 0, 100);

    if (!bestWaypoint || score > bestScore) {
      bestWaypoint = waypoint;
      bestScore = score;
    }
  }

  assertNonNullable(bestWaypoint);
  return bestWaypoint;
}

function _findTargetPosition(snapshot:ItineraryKeyframe, targetRoom:Room, targetXPercent:number = .5):Position {
  const claimedWaypoints = _findClaimedWaypoints(targetRoom.waypoints, snapshot);
  const bestWaypoint = _findBestTargetWaypoint(targetRoom.waypoints, claimedWaypoints, targetRoom, targetXPercent);
  return bestWaypoint.position;
}

export function generateAtActivityKeyframes(level:Level, 
    activity:Activity, editableItinerary:EditableItinerary, _errors:ErrorCollector):boolean {
  const { characterId, roomId } = activity.parts;
  assertNonNullable(characterId, 'implied subjects should have been resolved');
  assert(typeof roomId === 'string');
  const character = level.characters.find(c => c.id === characterId);
  const toRoom = findRoom(level.rooms, roomId);
  assertNonNullable(character);
  assertNonNullable(toRoom);

  if (activity.startTime === null) return false; // Need a starting time to learn starting position. A previous activity needs to be scheduled.

  const characterI = editableItinerary.characterIdToI[characterId];
  const fromSnapshot = createSnapshotAtTime(editableItinerary.keyframes, activity.startTime);
  const fromPos = fromSnapshot.characters[characterI].position;
  const toPos = _findTargetPosition(fromSnapshot, toRoom);

  // TODO find the route, find the duration, start time - check for conflicts.
  assertNonNullable(fromPos ?? toPos); // To fix build errs. TODO delete.

  return true;
}

export function createAtActivityParseFormat():ParseFormat {
  const characterId = makeIdentifier('characterId', 'CharacterId', true);
  const at = makeVerb('@');
  const roomId = makeIdentifier('roomId', 'RoomId');
  const rootParseStep = makeSequence([characterId, at, roomId]);
  return createParseFormat(rootParseStep);
}