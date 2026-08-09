import Activity from "../types/Activity";
import { ErrorCollector } from "@/levelLoading2/errorCollection";
import Level from "@/game/types/Level";
import ParseFormat from "../types/ParseFormat";
import { createParseFormat, makeIdentifier, makeSequence, makeVerb } from "../parseFormatUtil";
import { assert, assertNonNullable } from "decent-portal";
import { findRoom, findRoomAtPosition } from "@/game/roomUtil";
import EditableTimeline from "@/levelLoading2/timelineLoading/types/EditableTimeline";
import { createSnapshotAtTime, findLatestKeyFrameForCharacter } from "@/levelLoading2/timelineLoading/";
import TimelineKeyframe from "@/game/types/TimelineKeyframe";
import Room from "@/game/types/Room";
import Position, { arePositionsEqual } from "@/game/types/Position";
import Waypoint from "@/game/types/Waypoint";
import { ROOM_MIDDLE_ROW_CENTER_Z } from "@/game/roomSpaceConstants";
import { calcWalkDurationToRoom, scheduleCharacterMovementToRoom, scheduleCharacterMovementToRoomAtTime } from "../movementPlanningUtil";
import Character from "@/game/types/Character";
import { findNearestFloorWaypointToPosition, findNearestIncludedFloorWaypointToPosition } from "../waypointFindingUtil";

function _findClaimedWaypoints(waypoints:Waypoint[], snapshot:TimelineKeyframe):Waypoint[] {
  const claimedWaypoints:Waypoint[] = [];
  for(let characterI = 0; characterI < snapshot.characters.length; ++characterI) {
    const characterPosition = snapshot.characters[characterI].position;
    const claimedWaypoint = waypoints.find(waypoint => arePositionsEqual(waypoint.position, characterPosition));
    if (claimedWaypoint) claimedWaypoints.push(claimedWaypoint);
  }
  return claimedWaypoints;
}

function _findBestTargetWaypoint(waypoints:Waypoint[], claimedWaypoints:Waypoint[], targetRoom:Room, targetXPercent:number):Waypoint {
  const x = targetRoom.rect.x + (targetXPercent * targetRoom.rect.width);

  assert(waypoints.length > 0);

  const targetPosition = {x, y:0, z:ROOM_MIDDLE_ROW_CENTER_Z};
  let waypoint = findNearestIncludedFloorWaypointToPosition(targetRoom, targetPosition, claimedWaypoints); 
  if (waypoint) return waypoint;
  waypoint = findNearestFloorWaypointToPosition(targetRoom, targetPosition); // A crowded room. Just share a square with somebody else.
  assertNonNullable(waypoint, 'How can there be no available waypoints in the room?');
  return waypoint;
}

function _findCharacterIFromId(characters:readonly Character[], characterId:string):number|null {
  for(let i = 0; i < characters.length; ++i) {
    if (characters[i].id === characterId) return i;
  }
  return null;
}

function _findTargetPosition(snapshot:TimelineKeyframe, targetRoom:Room, targetXPercent:number = .5):Position {
  const claimedWaypoints = _findClaimedWaypoints(targetRoom.waypoints, snapshot);
  const bestWaypoint = _findBestTargetWaypoint(targetRoom.waypoints, claimedWaypoints, targetRoom, targetXPercent);
  return bestWaypoint.position;
}

export function scheduleAtActivity(level:Level, 
  activity:Activity, editableTimeline:EditableTimeline, errors:ErrorCollector):boolean {
  const { characterId, roomId } = activity.parts;
  assertNonNullable(characterId, 'implied subjects should have been resolved');
  assert(typeof roomId === 'string');
  const character = level.characters.find(c => c.id === characterId);
  const toRoom = findRoom(level.rooms, roomId);
  assertNonNullable(character);
  assertNonNullable(toRoom);

  const characterI = editableTimeline.characterIdToI[characterId];
  const isRelativeTimestamp = activity.endTime === null;
  
  const fromKeyframe = findLatestKeyFrameForCharacter(editableTimeline, characterI);
  const fromPos = fromKeyframe.characters[characterI].position;
  const fromTime = fromKeyframe.time;
  const fromRoom = findRoomAtPosition(level.rooms, fromPos.x, fromPos.y);
  assertNonNullable(fromRoom);
  
  const toKeyframe = isRelativeTimestamp 
    ? fromKeyframe
    : createSnapshotAtTime(editableTimeline.keyframes, activity.endTime!);
  const toPos = _findTargetPosition(toKeyframe, toRoom);
  const toTime = toKeyframe.time;

  const scheduleResult = isRelativeTimestamp 
    ? scheduleCharacterMovementToRoom(level.rooms, fromRoom, fromPos, fromTime, toRoom, toPos, characterI, editableTimeline)
    : scheduleCharacterMovementToRoomAtTime(level.rooms, fromRoom, fromPos, fromTime, toRoom, toPos, toTime, characterI, editableTimeline)
  if (typeof scheduleResult === 'string') {
    errors.addAt(scheduleResult, 'itinerary'); // TODO need line# from activity.
    return false;
  }
  assert(isRelativeTimestamp || toTime === scheduleResult);
  return true;
}

export function createAtActivityParseFormat():ParseFormat {
  const characterId = makeIdentifier('characterId', 'CharacterId', true);
  const at = makeVerb('@');
  const roomId = makeIdentifier('roomId', 'RoomId');
  const rootParseStep = makeSequence([characterId, at, roomId]);
  return createParseFormat(rootParseStep);
}

// This solves a catch-22 problem where the first activity in level itinerary is an "@" activity
// and I need to know what the startTime of the level is to create the editable timeline object.
// Because this is the very first activity in the level, it isn't necessary to have the editable timeline
// to check against waypoint claims.
export function findFirstAtActivityStartTime(rooms:readonly Room[], characters:readonly Character[], activeCharacterId:string, activity:Activity):number|string {
  let { characterId, roomId } = activity.parts;
  if (typeof characterId !== 'string') characterId = activeCharacterId;
  assert(typeof roomId === 'string');
  const characterI = _findCharacterIFromId(characters, characterId);
  const toRoom = findRoom(rooms, roomId);
  assertNonNullable(characterI);
  assertNonNullable(toRoom);
  assertNonNullable(activity.endTime);
  
  const fromPos = characters[characterI].position;
  const fromRoom = findRoomAtPosition(rooms, fromPos.x, fromPos.y);
  assertNonNullable(fromRoom);

  const targetXPercent = .5; // TODO get from activity.
  const bestWaypoint = _findBestTargetWaypoint(toRoom.waypoints, [], toRoom, targetXPercent);
  const toPos = bestWaypoint.position;

  const walkDuration = calcWalkDurationToRoom(rooms, fromRoom, fromPos, toRoom, toPos);
  if (typeof walkDuration === 'string') return walkDuration;
  return activity.endTime - walkDuration;
}