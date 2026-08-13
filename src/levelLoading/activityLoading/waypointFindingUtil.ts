/* This module groups waypoint constants and lookup helpers used by level loading.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import Room from "@/game/types/Room";
import Waypoint from "@/game/types/Waypoint";
import { FLOOR_WAYPOINT_Y_OFFSET, ROOM_BACK_ROW_CENTER_Z, ROOM_FRONT_ROW_CENTER_Z, ROOM_MIDDLE_ROW_CENTER_Z } from "@/game/roomSpaceConstants";
import Position, { arePositionsEqual } from "@/game/types/Position";
import { assert, assertNonNullable } from "decent-portal";
import RoomExit from "@/game/types/RoomExit";

export const WAYPOINT_BACK_ROW_Z = ROOM_BACK_ROW_CENTER_Z;
export const WAYPOINT_MIDDLE_ROW_Z = ROOM_MIDDLE_ROW_CENTER_Z;
export const WAYPOINT_FRONT_ROW_Z = ROOM_FRONT_ROW_CENTER_Z;

export function calcLandingWaypointY(y:number):number {
  return y - FLOOR_WAYPOINT_Y_OFFSET;
}

export function calcExitWaypointY(exit:RoomExit):number {
  return calcLandingWaypointY(exit.y);
}

function _findNearestXZWaypoint(waypoints:Waypoint[], x:number, y:number, z:number, excludedWaypoints:Waypoint[]):Waypoint|null {
  let nearestWaypoint:Waypoint|null = null;
  let nearestDistance = Infinity;
  waypoints.forEach(waypoint => {
    if (waypoint.position.y !== y || excludedWaypoints.includes(waypoint)) return;
    const distance = Math.hypot(waypoint.position.x - x, waypoint.position.z - z);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestWaypoint = waypoint;
    }
  });
  return nearestWaypoint;
}

function _isExitPositionSupported(roomRect:Room['rect'], exit:RoomExit):boolean {
  return exit.x === roomRect.x || exit.x === roomRect.x + roomRect.width
    || exit.y === roomRect.y + roomRect.height;
}

export function findExitWaypoint(roomId:string, roomRect:Room['rect'], exit:RoomExit, waypoints:Waypoint[]):Waypoint {
  assert(_isExitPositionSupported(roomRect, exit), `exit for room ${roomId} at (${exit.x}, ${exit.y}) is not on a supported boundary`);
  const waypoint = waypoints.find(candidate =>
    candidate.position.x === exit.x && candidate.position.y === calcExitWaypointY(exit) && candidate.position.z === WAYPOINT_MIDDLE_ROW_Z);
  assertNonNullable(waypoint, `missing exit waypoint for room ${roomId} at (${exit.x}, ${exit.y})`);
  return waypoint;
}

export function findNearestFloorWaypointToPosition(room:Room, position:Position):Waypoint {
  const floorY = room.rect.y + room.rect.height - FLOOR_WAYPOINT_Y_OFFSET;
  const waypoint = _findNearestXZWaypoint(room.waypoints, position.x, floorY, position.z, []);
  assertNonNullable(waypoint);
  return waypoint;
}

export function findNearestIncludedFloorWaypointToPosition(room:Room, position:Position, excludedWaypoints:Waypoint[]):Waypoint|null {
  const floorY = room.rect.y + room.rect.height - FLOOR_WAYPOINT_Y_OFFSET;
  return _findNearestXZWaypoint(room.waypoints, position.x, floorY, position.z, excludedWaypoints);
}

export function findWaypointAtPosition(room:Room, position:Position):Waypoint|null {
  return room.waypoints.find(w => arePositionsEqual(w.position, position)) ?? null;
}

export function isFloorWaypoint(room:Room, waypoint:Waypoint):boolean {
  return waypoint.position.y === room.rect.y + room.rect.height - FLOOR_WAYPOINT_Y_OFFSET;
}

export function isExitWaypoint(room:Room, waypoint:Waypoint):boolean {
  return waypoint.position.z === WAYPOINT_MIDDLE_ROW_Z
    && room.exits.some(exit => exit.x === waypoint.position.x && calcExitWaypointY(exit) === waypoint.position.y);
}