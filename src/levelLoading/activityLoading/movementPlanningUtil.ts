/* This module plans character movement along room waypoints and adds the resulting keyframes to editable timelines.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { assert, botch } from "decent-portal";

import Room from "@/game/types/Room";
import Waypoint from "../types/Waypoint";
import EditableTimeline from "../timelineLoading/types/EditableTimeline";
import Position from "@/game/types/Position";
import { arePositionsEqual } from "@/game/positionUtil";
import { findNearestFloorWaypointToPosition, isFloorWaypoint, WAYPOINT_MIDDLE_ROW_Z } from "./waypointFindingUtil";
import { addCharacterKeyChanges } from "../timelineLoading/editingUtil";
import { formatMsecsAsTimestamp } from "./timestampUtil";
import WaypointGenerationContext from "../types/WaypointGenerationContext";
import { FacingDirection } from "@/game/types/Character";

const WALK_MSECS_PER_PIXEL = 60;

type ScheduleResult = string /* error message */ |{ walkDuration:number, walkStartDelay:number };

function _createWaypointKey(waypoint:Waypoint):string {
  return `${waypoint.position.x},${waypoint.position.y},${waypoint.position.z}`;
}

function _isMiddleRowFloorWaypoint(room:Room, waypoint:Waypoint):boolean {
  return isFloorWaypoint(room, waypoint) && waypoint.position.z === WAYPOINT_MIDDLE_ROW_Z;
}

function _sortAdjacentWaypointsForPathTraversal(room:Room, targetWaypoint:Waypoint, 
    adjacentWaypoints:ReadonlyArray<Waypoint>):Waypoint[] {
  const targetIsMiddleRowFloorWaypoint = _isMiddleRowFloorWaypoint(room, targetWaypoint);
  return [...adjacentWaypoints].sort((waypoint1, waypoint2) => {
    if (targetIsMiddleRowFloorWaypoint) {
      const waypoint1IsMiddleRowFloor = _isMiddleRowFloorWaypoint(room, waypoint1);
      const waypoint2IsMiddleRowFloor = _isMiddleRowFloorWaypoint(room, waypoint2);
      if (waypoint1IsMiddleRowFloor !== waypoint2IsMiddleRowFloor) return waypoint1IsMiddleRowFloor ? -1 : 1;
    }

    const rowDistance1 = Math.abs(waypoint1.position.z - targetWaypoint.position.z);
    const rowDistance2 = Math.abs(waypoint2.position.z - targetWaypoint.position.z);
    if (rowDistance1 !== rowDistance2) return rowDistance1 - rowDistance2;

    const yDistance1 = Math.abs(waypoint1.position.y - targetWaypoint.position.y);
    const yDistance2 = Math.abs(waypoint2.position.y - targetWaypoint.position.y);
    if (yDistance1 !== yDistance2) return yDistance1 - yDistance2;

    const xDistance1 = Math.abs(waypoint1.position.x - targetWaypoint.position.x);
    const xDistance2 = Math.abs(waypoint2.position.x - targetWaypoint.position.x);
    if (xDistance1 !== xDistance2) return xDistance1 - xDistance2;

    return waypoint1.position.x - waypoint2.position.x || waypoint1.position.y - waypoint2.position.y;
  });
}

function _findWaypointPath(room:Room, fromWaypoint:Waypoint, toWaypoint:Waypoint):Waypoint[] {
  if (fromWaypoint === toWaypoint || arePositionsEqual(fromWaypoint.position, toWaypoint.position)) return [fromWaypoint];
  
  const pending:Waypoint[] = [fromWaypoint];
  const previousByKey = new Map<string, Waypoint|null>([[_createWaypointKey(fromWaypoint), null]]);
  while (pending.length > 0) {
    const waypoint = pending.shift()!;
    for (const adjacentWaypoint of _sortAdjacentWaypointsForPathTraversal(room, toWaypoint, waypoint.adjacentWaypoints)) {
      if (adjacentWaypoint.roomId !== room.id) continue;
      const key = _createWaypointKey(adjacentWaypoint);
      if (previousByKey.has(key)) continue;
      previousByKey.set(key, waypoint);
      if (adjacentWaypoint === toWaypoint) {
        const path = [toWaypoint];
        let current:Waypoint|null = waypoint;
        while (current) {
          path.unshift(current);
          current = previousByKey.get(_createWaypointKey(current)) ?? null;
        }
        return path;
      }
      pending.push(adjacentWaypoint);
    }
  }

  botch('A path should always be possible');
}

// Removes waypoints from path that aren't needed, returning an equivalent path for movement. The
// removal of a waypoint requires evaluation of 3 consecutive waypoint positions (A, B, C) where the
// angle of movement from A to B is equal to the angle of movement from B to C. When this condition is
// met, waypoint B can be removed, since the movement from A to C would be equivalent.
function _simplifyWaypointPath(waypoints:Waypoint[]):Waypoint[] {
  const simplifiedWaypoints:Waypoint[] = [];
  for (const waypoint of waypoints) {
    simplifiedWaypoints.push(waypoint);
    while (simplifiedWaypoints.length >= 3) {
      const a = simplifiedWaypoints[simplifiedWaypoints.length - 3].position;
      const b = simplifiedWaypoints[simplifiedWaypoints.length - 2].position;
      const c = simplifiedWaypoints[simplifiedWaypoints.length - 1].position;
      const ab = { x:b.x - a.x, y:b.y - a.y, z:b.z - a.z };
      const bc = { x:c.x - b.x, y:c.y - b.y, z:c.z - b.z };
      const hasZeroLengthSegment = (ab.x === 0 && ab.y === 0 && ab.z === 0)
        || (bc.x === 0 && bc.y === 0 && bc.z === 0);
      const hasSameMovementAngle = ab.y * bc.z === ab.z * bc.y
        && ab.z * bc.x === ab.x * bc.z
        && ab.x * bc.y === ab.y * bc.x
        && ab.x * bc.x + ab.y * bc.y + ab.z * bc.z > 0;
      if (!hasZeroLengthSegment && !hasSameMovementAngle) break;
      simplifiedWaypoints.splice(simplifiedWaypoints.length - 2, 1);
    }
  }
  return simplifiedWaypoints;
}

function _findWaypointPathThroughRooms(context:WaypointGenerationContext, fromRoom:Room, toRoom:Room,
    fromPosition:Position, toPosition:Position):Waypoint[] {
  const fromWaypoint = findNearestFloorWaypointToPosition(context, fromRoom, fromPosition);
  const toWaypoint = findNearestFloorWaypointToPosition(context, toRoom, toPosition);
  const pending:Waypoint[] = [fromWaypoint];
  const previousWaypoint = new Map<Waypoint, Waypoint|null>([[fromWaypoint, null]]);

  while (pending.length > 0) {
    const waypoint = pending.shift()!;
    const adjacentWaypoints = _sortAdjacentWaypointsForPathTraversal(toRoom, toWaypoint, waypoint.adjacentWaypoints);
    for (const adjacentWaypoint of adjacentWaypoints) {
      if (waypoint.roomId === toRoom.id && adjacentWaypoint.roomId !== toRoom.id) continue;
      if (previousWaypoint.has(adjacentWaypoint)) continue;
      previousWaypoint.set(adjacentWaypoint, waypoint);
      if (adjacentWaypoint === toWaypoint) {
        const path = [toWaypoint];
        let previous:Waypoint|null = waypoint;
        while (previous) {
          path.unshift(previous);
          previous = previousWaypoint.get(previous) ?? null;
        }
        return _simplifyWaypointPath(path);
      }
      pending.push(adjacentWaypoint);
    }
  }
  botch(`A waypoint path should exist from ${fromRoom.id} to ${toRoom.id}`);
}

function _calcWalkDurationBetweenPositions(fromPosition:Position, toPosition:Position):number {
  // Ignore Y movement because I like characters to hustle up/down the steps fast.
  const distance = Math.hypot(toPosition.x - fromPosition.x, toPosition.z - fromPosition.z);
  return Math.floor(distance * WALK_MSECS_PER_PIXEL);
}

function _calcWalkDurationForWaypointPath(waypoints:Waypoint[]):number {
  let duration = 0;
  for(let i = 0; i < waypoints.length - 1; ++i) {
    duration += _calcWalkDurationBetweenPositions(waypoints[i].position, waypoints[i+1].position);
  }
  return duration;
}

function _getSecondsText(msecs:number):string {
  if (msecs === 1000) return 'second';
  if (msecs > 1000) return `${Math.ceil(msecs / 1000)} seconds`;
  return `${msecs} milliseconds`;
}

function _getTravelDirection(fromPosition:Position, toPosition:Position):FacingDirection|null {
  return (fromPosition.x === toPosition.x) 
    ? null
    : toPosition.x > fromPosition.x ? 'right' : 'left';
}

function _scheduleFacingChangeAsNeeded(lastFacingDirection:FacingDirection|null, fromPosition:Position, fromTime:number, 
    toPosition:Position, characterI:number, timeline:EditableTimeline):FacingDirection|null {
  const facingDirection:FacingDirection|null = _getTravelDirection(fromPosition, toPosition);
  if (!facingDirection || facingDirection === lastFacingDirection) return lastFacingDirection;

  addCharacterKeyChanges({ facingDirection }, characterI, fromTime, timeline);
  return facingDirection;
}

// Returns walk duration
function _scheduleWaypointPath(waypointPath:Waypoint[], fromTime:number, characterI:number, initialFacingDirection:FacingDirection, timeline:EditableTimeline):number {
  let time = fromTime;
  let lastDirection:FacingDirection|null = initialFacingDirection;
  for (let i = 1; i < waypointPath.length; ++i) {
    const fromPosition = waypointPath[i-1].position;
    const toPosition = waypointPath[i].position;
    const walkDuration = _calcWalkDurationBetweenPositions(fromPosition, toPosition);
    if (walkDuration > 0) {
      lastDirection = _scheduleFacingChangeAsNeeded(lastDirection, fromPosition, time, toPosition, characterI, timeline);
      addCharacterKeyChanges({ position:toPosition }, characterI, time + walkDuration, timeline);
      time += walkDuration;
    }
    assert(walkDuration > 0); // Unneeded waypoints are being generated somewhere.
  }
  return time - fromTime;
}

// Returns walk duration
function _scheduleWaypointPathAfterDelay(waypointPath:Waypoint[], fromTime:number, delay:number,
    characterI:number, initialFacingDirection:FacingDirection, timeline:EditableTimeline):number {
  const walkStartTime = fromTime + delay;
  addCharacterKeyChanges({ position:waypointPath[0].position, bodyOrientation:'standing' }, characterI, walkStartTime, timeline);
  return _scheduleWaypointPath(waypointPath, walkStartTime, characterI, initialFacingDirection, timeline);
}

function _calcWalkStartDelayForWaypointPath(waypointPath:Waypoint[], maxWalkDuration:number):number {
  const walkDuration = _calcWalkDurationForWaypointPath(waypointPath);
  return maxWalkDuration - walkDuration;
}

function _createCantArriveInTimeMessage(room:Room, msecsNeeded:number, toTime:number):string {
  const secondsNeeded = _getSecondsText(msecsNeeded);
  const toTimestamp = formatMsecsAsTimestamp(toTime);
  return `Can't arrive at destination in "${room.id}" room by ${toTimestamp}}. Need another ${secondsNeeded}.`;
}

function _scheduleCharacterMovementWithinRoom(context:WaypointGenerationContext, room:Room, fromPosition:Position, fromTime:number, toPosition:Position, 
    toTime:number|null, characterI:number, initialFacingDirection:FacingDirection, timeline:EditableTimeline):ScheduleResult {
  assert(toTime === null || toTime >= fromTime);
  const fromWaypoint = findNearestFloorWaypointToPosition(context, room, fromPosition);
  const toWaypoint = findNearestFloorWaypointToPosition(context, room, toPosition);
  const waypointPath = _simplifyWaypointPath(_findWaypointPath(room, fromWaypoint, toWaypoint));

  const walkStartDelay = toTime === null ? 0 : _calcWalkStartDelayForWaypointPath(waypointPath, toTime - fromTime);
  if (walkStartDelay < 0) return _createCantArriveInTimeMessage(room, -walkStartDelay, toTime!);

  const walkDuration = _scheduleWaypointPathAfterDelay(waypointPath, fromTime, walkStartDelay, characterI, initialFacingDirection, timeline);
  assert(toTime === null || fromTime + walkStartDelay + walkDuration === toTime);
  return { walkDuration, walkStartDelay};
}

function _scheduleCharacterMovementToRoomAtTime(context:WaypointGenerationContext, fromRoom:Room, fromPosition:Position, 
    fromTime:number, toRoom:Room, toPosition:Position, toTime:number|null, characterI:number, initialFacingDirection:FacingDirection,
    timeline:EditableTimeline):ScheduleResult {
  if (arePositionsEqual(fromPosition, toPosition)) return { walkStartDelay:0, walkDuration:0 }; // Character already at destination.
  
  if (fromRoom.id === toRoom.id) {
    return _scheduleCharacterMovementWithinRoom(context, fromRoom, fromPosition, fromTime, toPosition, 
        toTime, characterI, initialFacingDirection, timeline);
  }
  const waypointPath = _findWaypointPathThroughRooms(context, fromRoom, toRoom, fromPosition, toPosition);

  const walkStartDelay = toTime === null ? 0 : _calcWalkStartDelayForWaypointPath(waypointPath, toTime - fromTime);
  if (walkStartDelay < 0) return _createCantArriveInTimeMessage(toRoom, -walkStartDelay, toTime!);

  const walkDuration = _scheduleWaypointPathAfterDelay(waypointPath, fromTime, walkStartDelay, characterI, initialFacingDirection, timeline);
  assert(toTime === null || fromTime + walkStartDelay + walkDuration === toTime);
  
  return { walkStartDelay, walkDuration };
}

export function scheduleCharacterMovementWithinRoom(context:WaypointGenerationContext, room:Room, fromPosition:Position, fromTime:number, toPosition:Position, 
    characterI:number, initialFacingDirection:FacingDirection, timeline:EditableTimeline):ScheduleResult {
  return _scheduleCharacterMovementWithinRoom(context, room, fromPosition, fromTime, toPosition, null, 
      characterI, initialFacingDirection, timeline);
}

export function scheduleCharacterMovementToRoomAtTime(context:WaypointGenerationContext, fromRoom:Room, fromPosition:Position, 
    fromTime:number, toRoom:Room, toPosition:Position, toTime:number, characterI:number, initialFacingDirection:FacingDirection,
    timeline:EditableTimeline):ScheduleResult {
  return _scheduleCharacterMovementToRoomAtTime(context, fromRoom, fromPosition, fromTime, toRoom, toPosition,
      toTime, characterI, initialFacingDirection, timeline);
}

export function scheduleCharacterMovementToRoom(context:WaypointGenerationContext, fromRoom:Room, fromPosition:Position, 
    fromTime:number, toRoom:Room, toPosition:Position, characterI:number, initialFacingDirection:FacingDirection, timeline:EditableTimeline):ScheduleResult {
  return _scheduleCharacterMovementToRoomAtTime(context, fromRoom, fromPosition, fromTime, toRoom, toPosition,
      null, characterI, initialFacingDirection, timeline);
}