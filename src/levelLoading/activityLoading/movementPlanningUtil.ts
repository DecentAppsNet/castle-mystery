import { assert, assertNonNullable, botch } from "decent-portal";

import { isNormalizedId } from "@/game/idUtil";
import { findRoom } from "@/game/roomUtil";
import Room from "@/game/types/Room";
import Waypoint from "@/game/types/Waypoint";
import EditableTimeline from "../timelineLoading/types/EditableTimeline";
import Position, { arePositionsEqual } from "@/game/types/Position";
import { findNearestFloorWaypointToPosition, isFloorWaypoint, WAYPOINT_MIDDLE_ROW_Z } from "./waypointFindingUtil";
import { addCharacterKeyframe } from "../timelineLoading/editingUtil";
import { formatMsecsAsTimestamp } from "./timestampUtil";
import { isPositionInOrOnRect } from "@/game/rectUtil";
import { findWaypointAtPosition } from "./waypointFindingUtil";

const WALK_MSECS_PER_PIXEL = 60;

function _createWaypointKey(waypoint:Waypoint):string {
  return `${waypoint.position.x},${waypoint.position.y},${waypoint.position.z}`;
}

function _findRoomPath(rooms:readonly Room[], fromRoomId:string, targetRoomId:string):readonly Room[]|null {
  assert(isNormalizedId(fromRoomId));
  assert(isNormalizedId(targetRoomId));
  const fromRoom = findRoom(rooms, fromRoomId);
  assertNonNullable(fromRoom);
  if (fromRoomId === targetRoomId) return [fromRoom];
  const pending:string[] = [fromRoomId];
  const previousRoomIdByRoomId = new Map<string, string|null>([[fromRoomId, null]]);

  while (pending.length > 0) {
    const roomId = pending.shift()!;
    const room = findRoom(rooms, roomId);
    assertNonNullable(room, `room with id ${roomId} not found`);
    for (const exit of room.exits) {
      const neighborRoomId = exit.room1Id === roomId ? exit.room2Id : exit.room1Id;
      if (previousRoomIdByRoomId.has(neighborRoomId)) continue;
      previousRoomIdByRoomId.set(neighborRoomId, roomId);
      if (neighborRoomId === targetRoomId) {
        const targetRoom = findRoom(rooms, targetRoomId);
        assertNonNullable(targetRoom);
        const roomPath = [targetRoom];
        let currentRoomId:string|null = roomId;
        while (currentRoomId) {
          const currentRoom = findRoom(rooms, currentRoomId);
          assertNonNullable(currentRoom);
          roomPath.unshift(currentRoom);
          currentRoomId = previousRoomIdByRoomId.get(currentRoomId) ?? null;
        }
        return roomPath;
      }
      pending.push(neighborRoomId);
    }
  }
  return null;
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

function _joinWaypointPaths(a:Waypoint[], b:Waypoint[]):Waypoint[] {
  if (!b.length) return a;
  if (!a.length) return b;
  if (arePositionsEqual(a[a.length-1].position, b[0].position)) b = b.splice(1); // Omit redundant waypoint.
  return a.concat(b);
}

function _findWaypointPathThroughRooms(roomPath:readonly Room[], fromPosition:Position, toPosition:Position):Waypoint[] {
  if (!roomPath.length) return [];
  const waypoints:Waypoint[] = [];
  assert(isPositionInOrOnRect(fromPosition.x, fromPosition.y, roomPath[0].rect));
  let waypoint = findNearestFloorWaypointToPosition(roomPath[0], fromPosition);
  assert(roomPath[0].waypoints.includes(waypoint));
  waypoints.push(waypoint);
  for(let i = 1; i < roomPath.length; ++i) {
    let iterationCount = 0;
    const nextRoomId = roomPath[i].id;
    const nextRoomStartWaypoint = findWaypointAtPosition(roomPath[i], waypoint.position); // Need waypoint in next room at same position as exit from previous room.
    assertNonNullable(nextRoomStartWaypoint);
    waypoint = nextRoomStartWaypoint;
    while(iterationCount <= roomPath[i].waypoints.length) { // A debug-error exit, but could prevent browser hang.
      const nextWaypoint:Waypoint|undefined = waypoint.exitDirections[nextRoomId];
      if (nextWaypoint === undefined) break; // Reached room exit.
      waypoints.push(nextWaypoint);
      waypoint = nextWaypoint;
      ++iterationCount;
    }
    assert(iterationCount <= roomPath[i].waypoints.length);
  }

  // Last part of path is to specific position in final room.
  const toRoom = roomPath[roomPath.length-1];
  const toWaypoint = findNearestFloorWaypointToPosition(toRoom, toPosition);
  const fromWaypoint = findWaypointAtPosition(toRoom, waypoint.position); // Need waypoint in the destination room.
  assertNonNullable(fromWaypoint);
  const finalRoomWaypoints = _findWaypointPath(toRoom, fromWaypoint, toWaypoint);
  return _simplifyWaypointPath(_joinWaypointPaths(waypoints, finalRoomWaypoints));
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

function _scheduleWaypointPath(waypointPath:Waypoint[], fromTime:number, characterI:number, timeline:EditableTimeline):number {
  let time = fromTime;
  for (let i = 1; i < waypointPath.length; ++i) {
    const fromPosition = waypointPath[i-1].position;
    const toPosition = waypointPath[i].position;
    const walkDuration = _calcWalkDurationBetweenPositions(fromPosition, toPosition);
    addCharacterKeyframe({ position:toPosition }, characterI, time + walkDuration, timeline);
    time += walkDuration;
  }
  return time;
}

function _scheduleCharacterMovementWithinRoom(room:Room, fromPosition:Position, fromTime:number, toPosition:Position, 
    toTime:number|null, characterI:number, timeline:EditableTimeline):string|number {
  assert(toTime === null || toTime >= fromTime);
  const fromWaypoint = findNearestFloorWaypointToPosition(room, fromPosition);
  const toWaypoint = findNearestFloorWaypointToPosition(room, toPosition);
  const waypointPath = _simplifyWaypointPath(_findWaypointPath(room, fromWaypoint, toWaypoint));
  const pathWalkDuration = _calcWalkDurationForWaypointPath(waypointPath);

  let extraTime = 0;
  if (toTime !== null) {
    const maxWalkDuration = toTime - fromTime;
    extraTime = maxWalkDuration - pathWalkDuration;
    if (extraTime < 0) {
      const secondsNeeded = _getSecondsText(pathWalkDuration - maxWalkDuration);
      const toTimestamp = formatMsecsAsTimestamp(toTime);
      return `Can't arrive at destination in "${room.id}" room by ${toTimestamp}}. Need another ${secondsNeeded}.`;
    }
  }

  let scheduledEndTime = _scheduleWaypointPath(waypointPath, fromTime + extraTime, characterI, timeline);  
  assert(toTime === null || scheduledEndTime === toTime);
  return scheduledEndTime;
}

// If successful, returns the amount of delay from fromTime that was used in scheduling. If unsuccessful return error message.
function _scheduleCharacterMovementToRoomAtTime(rooms:readonly Room[], fromRoom:Room, fromPosition:Position, 
    fromTime:number, toRoom:Room, toPosition:Position, toTime:number|null, characterI:number, timeline:EditableTimeline):string|number {
  if (arePositionsEqual(fromPosition, toPosition)) return fromTime; // Character already at destination.
  
  if (fromRoom.id === toRoom.id) {
    return _scheduleCharacterMovementWithinRoom(fromRoom, fromPosition, fromTime, toPosition, 
        toTime, characterI, timeline);
  }
  
  const roomPath = _findRoomPath(rooms, fromRoom.id, toRoom.id);
  if (!roomPath) return `Could not find path from "${fromRoom.id}" room to "${toRoom.id}" room.`;

  const waypointPath = _findWaypointPathThroughRooms(roomPath, fromPosition, toPosition);

  let extraTime = 0;
  if (toTime !== null) {
    const pathWalkDuration = _calcWalkDurationForWaypointPath(waypointPath);
    const maxWalkDuration = toTime - fromTime;
    extraTime = maxWalkDuration - pathWalkDuration;
    if (extraTime < 0) {
      const secondsNeeded = _getSecondsText(pathWalkDuration - maxWalkDuration);
      const toTimestamp = formatMsecsAsTimestamp(toTime);
      return `Can't arrive at destination in "${fromRoom.id}" room by ${toTimestamp}. Need another ${secondsNeeded}.`;
    }
  }

  const scheduledEndTime = _scheduleWaypointPath(waypointPath, fromTime + extraTime, characterI, timeline);  
  assert(toTime === null || scheduledEndTime === toTime);
  
  return extraTime;
}

export function scheduleCharacterMovementWithinRoom(room:Room, fromPosition:Position, fromTime:number, toPosition:Position, 
    characterI:number, timeline:EditableTimeline):string|number {
  return _scheduleCharacterMovementWithinRoom(room, fromPosition, fromTime, toPosition, null, 
      characterI, timeline);
}

export function scheduleCharacterMovementToRoomAtTime(rooms:readonly Room[], fromRoom:Room, fromPosition:Position, 
    fromTime:number, toRoom:Room, toPosition:Position, toTime:number, characterI:number, timeline:EditableTimeline):string|number {
  return _scheduleCharacterMovementToRoomAtTime(rooms, fromRoom, fromPosition, fromTime, toRoom, toPosition,
      toTime, characterI, timeline);
}

export function scheduleCharacterMovementToRoom(rooms:readonly Room[], fromRoom:Room, fromPosition:Position, 
    fromTime:number, toRoom:Room, toPosition:Position, characterI:number, timeline:EditableTimeline):string|number {
  return _scheduleCharacterMovementToRoomAtTime(rooms, fromRoom, fromPosition, fromTime, toRoom, toPosition,
      null, characterI, timeline);
}