import Activity from "../types/Activity";
import { ErrorCollector } from "@/levelLoading2/errorCollection";
import Level from "@/game/types/Level";
import ParseFormat from "../types/ParseFormat";
import { createParseFormat, makeIdentifier, makeSequence, makeVerb } from "../parseFormatUtil";
import { assert, assertNonNullable } from "decent-portal";
import { findRoom, findRoomAtPosition } from "@/game/roomUtil";
import EditableItinerary from "@/levelLoading2/itineraryLoading/types/EditableItinerary";
import { createSnapshotAtTime, findLatestKeyFrameForCharacter } from "@/levelLoading2/itineraryLoading/";
import ItineraryKeyframe from "@/levelLoading2/itineraryLoading/types/ItineraryKeyframe";
import Room from "@/game/types/Room";
import Position, { arePositionsEqual } from "@/game/types/Position";
import Waypoint from "@/game/types/Waypoint";
import { ROOM_MIDDLE_ROW_CENTER_Z } from "@/game/roomSpaceConstants";
import { clamp } from "@/common/numberUtil";
import { calcWalkDurationToRoom, scheduleCharacterMovementToRoom, scheduleCharacterMovementToRoomAtTime } from "../movementPlanningUtil";
import Character from "@/game/types/Character";

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


function _findCharacterIFromId(characters:readonly Character[], characterId:string):number|null {
  for(let i = 0; i < characters.length; ++i) {
    if (characters[i].id === characterId) return i;
  }
  return null;
}

function _findTargetPosition(snapshot:ItineraryKeyframe, targetRoom:Room, targetXPercent:number = .5):Position {
  const claimedWaypoints = _findClaimedWaypoints(targetRoom.waypoints, snapshot);
  const bestWaypoint = _findBestTargetWaypoint(targetRoom.waypoints, claimedWaypoints, targetRoom, targetXPercent);
  return bestWaypoint.position;
}

export function scheduleAtActivity(level:Level, 
    activity:Activity, editableItinerary:EditableItinerary, errors:ErrorCollector):boolean {
  const { characterId, roomId } = activity.parts;
  assertNonNullable(characterId, 'implied subjects should have been resolved');
  assert(typeof roomId === 'string');
  const character = level.characters.find(c => c.id === characterId);
  const toRoom = findRoom(level.rooms, roomId);
  assertNonNullable(character);
  assertNonNullable(toRoom);

  const characterI = editableItinerary.characterIdToI[characterId];
  const isRelativeTimestamp = activity.startTime === null;
  
  const fromKeyframe = findLatestKeyFrameForCharacter(editableItinerary, characterI);
  const fromPos = fromKeyframe.characters[characterI].position;
  const fromTime = fromKeyframe.time;
  const fromRoom = findRoomAtPosition(level.rooms, fromPos.x, fromPos.y);
  assertNonNullable(fromRoom);
  
  const toKeyframe = isRelativeTimestamp 
    ? fromKeyframe
    : createSnapshotAtTime(editableItinerary.keyframes, activity.startTime!);
  const toPos = _findTargetPosition(toKeyframe, toRoom);
  const toTime = toKeyframe.time;

  const errorMessage = isRelativeTimestamp 
    ? scheduleCharacterMovementToRoom(level.rooms, fromRoom, fromPos, fromTime, toRoom, toPos, characterI, editableItinerary)
    : scheduleCharacterMovementToRoomAtTime(level.rooms, fromRoom, fromPos, fromTime, toRoom, toPos, toTime, characterI, editableItinerary)
  if (!errorMessage) return true;
  
  errors.addAt(errorMessage, 'itinerary'); // TODO need line# from activity.
  return false;
}

export function createAtActivityParseFormat():ParseFormat {
  const characterId = makeIdentifier('characterId', 'CharacterId', true);
  const at = makeVerb('@');
  const roomId = makeIdentifier('roomId', 'RoomId');
  const rootParseStep = makeSequence([characterId, at, roomId]);
  return createParseFormat(rootParseStep);
}

// This solves a catch-22 problem where the first activity in level itinerary is an "@" activity
// and I need to know what the startTime of the level is to create the editable itinerary object.
// Because this is the very first activity in the level, it isn't necessary to have the editable itinerary
// to check against waypoint claims.
export function findFirstAtActivityStartTime(level:Level, activity:Activity):number|string {
  const { characterId, roomId } = activity.parts;
  assert(typeof characterId === 'string', 'implied subjects should have been resolved');
  assert(typeof roomId === 'string');
  const characterI = _findCharacterIFromId(level.characters, characterId);
  const toRoom = findRoom(level.rooms, roomId);
  assertNonNullable(characterI);
  assertNonNullable(toRoom);
  assertNonNullable(activity.startTime, 'Caller should check for this');
  
  const fromPos = level.characters[characterI].position;
  const fromRoom = findRoomAtPosition(level.rooms, fromPos.x, fromPos.y);
  assertNonNullable(fromRoom);

  const targetXPercent = .5; // TODO get from activity.
  const bestWaypoint = _findBestTargetWaypoint(toRoom.waypoints, [], toRoom, targetXPercent);
  const toPos = bestWaypoint.position;

  const walkDuration = calcWalkDurationToRoom(level.rooms, fromRoom, fromPos, toRoom, toPos);
  if (typeof walkDuration === 'string') return walkDuration;
  return activity.startTime - walkDuration;
}