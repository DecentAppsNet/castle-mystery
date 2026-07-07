/* This module groups shared activity movement and waypoint-planning helpers used during level load.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { assertNonNullable } from "decent-portal";

import Level from "@/game/types/Level";
import Position from "@/game/types/Position";
import Room from "@/game/types/Room";
import RoomExit from "@/game/types/RoomExit";
import Waypoint from "@/game/types/Waypoint";
import ItineraryEvent from "@/game/types/itineraryEvents/ItineraryEvent";
import { isPositionStrictlyInRect } from "@/game/rectUtil";
import { findRoom } from "@/game/roomUtil";
import { findExitWaypoint, findNearestWaypoint, findNearestWaypointToPosition, FLOOR_WAYPOINT_Y_OFFSET, WAYPOINT_MIDDLE_ROW_Z } from "@/game/waypointUtil";
import {
  createRoomEntryEvent,
  createWalkEvent,
} from "@/game/itineraryUtil";
import { assertNormalizedId } from "@/game/idUtil";

import { findCurrentRoomForWaypoint } from "./activityStateUtil";

function _createWaypointKey(waypoint:Waypoint):string {
  return `${waypoint.position.x},${waypoint.position.y},${waypoint.position.z}`;
}

function _isInteriorWaypoint(room:Room, waypoint:Waypoint):boolean {
  return waypoint.position.x > room.rect.x && waypoint.position.x < room.rect.x + room.rect.width;
}

function _findInteriorMiddleRowFloorWaypoints(room:Room, occupiedWaypointKeys:Set<string>):Waypoint[] {
  const floorY = room.rect.y + room.rect.height - FLOOR_WAYPOINT_Y_OFFSET;
  const isInteriorMiddleRowFloorWaypoint = (waypoint:Waypoint) => waypoint.position.y === floorY
    && waypoint.position.z === WAYPOINT_MIDDLE_ROW_Z
    && _isInteriorWaypoint(room, waypoint);
  const unclaimedInteriorMiddleRowFloorWaypoints = room.waypoints.filter(waypoint => isInteriorMiddleRowFloorWaypoint(waypoint)
    && !occupiedWaypointKeys.has(_createWaypointKey(waypoint)));
  if (unclaimedInteriorMiddleRowFloorWaypoints.length > 0) return unclaimedInteriorMiddleRowFloorWaypoints;
  return room.waypoints.filter(isInteriorMiddleRowFloorWaypoint);
}

function _findNearestFloorWaypointByX(room:Room, targetX:number, occupiedWaypointKeys:Set<string> = new Set()):Waypoint {
  const floorWaypoints = _findInteriorMiddleRowFloorWaypoints(room, occupiedWaypointKeys);
  if (!floorWaypoints.length) throw new Error(`unable to find floor waypoint in room ${room.id}`);
  return floorWaypoints.reduce((nearestWaypoint, waypoint) => {
    if (!nearestWaypoint) return waypoint;
    const nearestDistance = Math.abs(nearestWaypoint.position.x - targetX);
    const distance = Math.abs(waypoint.position.x - targetX);
    return distance < nearestDistance ? waypoint : nearestWaypoint;
  }, null as Waypoint | null)!;
}

function _findNearestWaypointWithFallbacks(room:Room, x:number, y:number,
  predicates:((((waypoint:Waypoint) => boolean)) | undefined)[]):Waypoint {
  for (const predicate of predicates) {
    try {
      return findNearestWaypoint(room, x, y, predicate);
    } catch {
      continue;
    }
  }

  throw new Error(`unable to find waypoint in room ${room.id}`);
}

function _findPreferredWaypointInRoom(room:Room, occupiedWaypointKeys:Set<string> = new Set()):Waypoint {
  const centerX = Math.floor(room.rect.x + room.rect.width / 2);
  const centerY = Math.floor(room.rect.y + room.rect.height / 2);
  const isInteriorWaypoint = (waypoint:Waypoint) => isPositionStrictlyInRect(waypoint.position.x, waypoint.position.y, room.rect);

  try {
    return _findNearestFloorWaypointByX(room, centerX, occupiedWaypointKeys);
  } catch {
    return _findNearestWaypointWithFallbacks(room, centerX, centerY, [
      waypoint => isInteriorWaypoint(waypoint) && !occupiedWaypointKeys.has(_createWaypointKey(waypoint)),
      isInteriorWaypoint,
      waypoint => !occupiedWaypointKeys.has(_createWaypointKey(waypoint)),
      undefined
    ]);
  }
}

function _findTargetWaypointInRoom(room:Room, targetPosition:Position|null, occupiedWaypointKeys:Set<string> = new Set(), targetXPercent:number|null = null):Waypoint {
  if (targetXPercent !== null) {
    const targetX = room.rect.x + room.rect.width * (targetXPercent / 100);
    return _findNearestFloorWaypointByX(room, targetX, occupiedWaypointKeys);
  }
  if (!targetPosition) return _findPreferredWaypointInRoom(room, occupiedWaypointKeys);
  return findNearestWaypointToPosition(room, targetPosition, waypoint => !occupiedWaypointKeys.has(_createWaypointKey(waypoint)));
}

function _findConnectingExit(room:Room, otherRoomId:string):RoomExit {
  assertNormalizedId(otherRoomId, 'room');
  const exit = room.exits.find(candidate => candidate.room1Id === otherRoomId || candidate.room2Id === otherRoomId);
  assertNonNullable(exit, `no exit connects ${room.id} to ${otherRoomId}`);
  return exit;
}

function _findRoomPath(level:Level, fromRoomId:string, targetRoomId:string):string[] {
  assertNormalizedId(fromRoomId, 'room');
  assertNormalizedId(targetRoomId, 'room');
  if (fromRoomId === targetRoomId) return [fromRoomId];
  const pending:string[] = [fromRoomId];
  const previousRoomIdByRoomId = new Map<string, string|null>([[fromRoomId, null]]);

  while (pending.length > 0) {
    const roomId = pending.shift()!;
    const room = findRoom(level.rooms, roomId);
    if (!room) throw new Error(`room with id ${roomId} not found`);
    for (const exit of room.exits) {
      const neighborRoomId = exit.room1Id === roomId ? exit.room2Id : exit.room1Id;
      if (previousRoomIdByRoomId.has(neighborRoomId)) continue;
      previousRoomIdByRoomId.set(neighborRoomId, roomId);
      if (neighborRoomId === targetRoomId) {
        const roomPath = [targetRoomId];
        let currentRoomId:string|null = roomId;
        while (currentRoomId) {
          roomPath.unshift(currentRoomId);
          currentRoomId = previousRoomIdByRoomId.get(currentRoomId) ?? null;
        }
        return roomPath;
      }
      pending.push(neighborRoomId);
    }
  }

  throw new Error(`no room path found from ${fromRoomId} to ${targetRoomId}`);
}

function _isMiddleRowFloorWaypoint(room:Room, waypoint:Waypoint):boolean {
  const floorY = room.rect.y + room.rect.height - FLOOR_WAYPOINT_Y_OFFSET;
  return Math.abs(waypoint.position.y - floorY) <= FLOOR_WAYPOINT_Y_OFFSET
    && waypoint.position.z === WAYPOINT_MIDDLE_ROW_Z;
}

function _sortAdjacentWaypointsForPathTraversal(room:Room, targetWaypoint:Waypoint, adjacentWaypoints:ReadonlyArray<Waypoint>):Waypoint[] {
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

export function findWaypointPath(room:Room, fromWaypoint:Waypoint, toWaypoint:Waypoint):Waypoint[] {
  if (fromWaypoint === toWaypoint) return [fromWaypoint];
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

  throw new Error(`no waypoint path found in room ${room.id}`);
}

export function planMovementWithinRoom(room:Room, fromWaypoint:Waypoint, targetWaypoint:Waypoint, startTime:number = 0):ItineraryEvent[] {
  const waypointPath = findWaypointPath(room, fromWaypoint, targetWaypoint);
  const events:ItineraryEvent[] = [];
  let currentWaypoint = fromWaypoint;
  let currentTime = startTime;

  for (let i = 1; i < waypointPath.length; ++i) {
    const nextWaypoint = waypointPath[i];
    const walkEvent = createWalkEvent(room, currentTime, currentWaypoint.position.x, currentWaypoint.position.y,
      nextWaypoint.position.x, nextWaypoint.position.y, currentWaypoint.position, nextWaypoint.position);
    if (!walkEvent) {
      currentWaypoint = nextWaypoint;
      continue;
    }
    events.push(walkEvent);
    currentTime = walkEvent.startTime + walkEvent.duration;
    currentWaypoint = nextWaypoint;
  }

  return events;
}

export function planMovementToRoom(level:Level, fromWaypoint:Waypoint, targetRoomId:string,
  occupiedWaypointKeys:Set<string> = new Set(), targetPosition:Position|null = null, targetXPercent:number|null = null):ItineraryEvent[] {
  const currentRoom = findCurrentRoomForWaypoint(level, fromWaypoint);
  const targetRoom = findRoom(level.rooms, targetRoomId);
  if (!targetRoom) throw new Error(`room with id ${targetRoomId} not found`);
  const targetWaypoint = _findTargetWaypointInRoom(targetRoom, targetPosition, occupiedWaypointKeys, targetXPercent);
  if (currentRoom.id === targetRoomId) {
    if (fromWaypoint === targetWaypoint) return [];
    return planMovementWithinRoom(currentRoom, fromWaypoint, targetWaypoint, 0);
  }
  const roomPath = _findRoomPath(level, currentRoom.id, targetRoom.id);
  const events:ItineraryEvent[] = [];
  let currentWaypoint = fromWaypoint;
  let currentTime = 0;

  for (let i = 0; i < roomPath.length - 1; ++i) {
    const room = findRoom(level.rooms, roomPath[i]);
    const nextRoom = findRoom(level.rooms, roomPath[i + 1]);
    if (!room) throw new Error(`room with id ${roomPath[i]} not found`);
    if (!nextRoom) throw new Error(`room with id ${roomPath[i + 1]} not found`);
    while (currentWaypoint.exitDirections[nextRoom.id]) {
      const nextWaypoint = currentWaypoint.exitDirections[nextRoom.id]!;
      const walkEvent = createWalkEvent(room, currentTime, currentWaypoint.position.x, currentWaypoint.position.y,
        nextWaypoint.position.x, nextWaypoint.position.y, currentWaypoint.position, nextWaypoint.position);
      if (!walkEvent) {
        currentWaypoint = nextWaypoint;
        continue;
      }
      events.push(walkEvent);
      currentTime = walkEvent.startTime + walkEvent.duration;
      currentWaypoint = nextWaypoint;
    }

    const exit = _findConnectingExit(room, nextRoom.id);
    const nextRoomExitWaypoint = findExitWaypoint(nextRoom.id, nextRoom.rect, exit, nextRoom.waypoints);
    const crossRoomWalkEvent = createWalkEvent(nextRoom, currentTime, currentWaypoint.position.x, currentWaypoint.position.y,
      nextRoomExitWaypoint.position.x, nextRoomExitWaypoint.position.y, currentWaypoint.position, nextRoomExitWaypoint.position);
    if (crossRoomWalkEvent) {
      events.push(crossRoomWalkEvent);
      currentTime = crossRoomWalkEvent.startTime + crossRoomWalkEvent.duration;
    }
    currentWaypoint = nextRoomExitWaypoint;
    events.push(createRoomEntryEvent(currentTime, nextRoom.id));
  }

  const finalRoom = findRoom(level.rooms, targetRoomId);
  if (!finalRoom) throw new Error(`room with id ${targetRoomId} not found`);
  const finalEvents = planMovementWithinRoom(finalRoom, currentWaypoint, targetWaypoint, currentTime);
  events.push(...finalEvents);

  return events;
}