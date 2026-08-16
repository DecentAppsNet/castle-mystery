import Activity from "../types/Activity";
import { ErrorCollector } from "@/levelLoading/errorCollection";
import Level from "@/game/types/Level";
import ParseFormat from "../types/ParseFormat";
import { createParseFormat, makeIdentifier, makeSequence, makeVerb } from "../parseFormatUtil";
import { assert, assertNonNullable } from "decent-portal";
import { findRoom, findRoomAtPosition } from "@/game/roomUtil";
import EditableTimeline from "@/levelLoading/timelineLoading/types/EditableTimeline";
import TimelineKeyframe from "@/game/types/TimelineKeyframe";
import Room from "@/game/types/Room";
import Position, { arePositionsEqual } from "@/game/types/Position";
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

export function scheduleAtActivity(level:Level, waypointContext:WaypointGenerationContext,
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
  const fromTime = fromKeyframe.time; // The very earliest that the character can begin moving toward destination.
  const fromFacingDirection = fromKeyframe.characters[characterI].facingDirection;
  const fromRoom = findRoomAtPosition(level.rooms, fromPos.x, fromPos.y);
  assertNonNullable(fromRoom);

  if (fromRoom.id === toRoom.id) { // Already at room. TODO - extra handling for `@ Room.20%` and `@ 20%`-style activities that mean the character must still move within the room.
    const endTime = isRelativeTimestamp ? fromTime : activity.endTime; // Use activity end time if available, because that can affect the timing of following activities.
    activity.startTime = activity.endTime = endTime;
    return true;
  }
  
  assert(activity.endTime === null || activity.endTime >= level.startTime);
  const toKeyframe = isRelativeTimestamp 
    ? fromKeyframe
    : createKeyframeAtTime(editableTimeline.keyframes, activity.endTime!);
  const toPos = _findTargetPosition(waypointContext, toKeyframe, toRoom);
  const toTime = toKeyframe.time;

  const scheduleResult = isRelativeTimestamp 
    ? scheduleCharacterMovementToRoom(waypointContext, fromRoom, fromPos, fromTime, toRoom, toPos, characterI, fromFacingDirection, editableTimeline)
    : scheduleCharacterMovementToRoomAtTime(waypointContext, fromRoom, fromPos, fromTime, toRoom, toPos, toTime, characterI, fromFacingDirection, editableTimeline)
  if (typeof scheduleResult === 'string') {
    errors.addAtLine(scheduleResult, activity.lineI);
    return false;
  }

  assert(scheduleResult >= 0); // scheduleResult is the amount of time delayed before beginning movement toward destination.
  activity.startTime = fromTime + scheduleResult;
  activity.endTime = toTime;
  return true;
}

export function createAtActivityParseFormat():ParseFormat {
  const characterId = makeIdentifier('characterId', 'CharacterId', true);
  const at = makeVerb('@');
  const roomId = makeIdentifier('roomId', 'RoomId');
  const rootParseStep = makeSequence([characterId, at, roomId]);
  return createParseFormat(rootParseStep);
}