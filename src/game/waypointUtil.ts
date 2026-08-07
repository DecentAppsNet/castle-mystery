/* This module groups waypoint constants and lookup helpers used by room navigation and authored placement logic.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

/*
The two exported functions in this module are only used by level loading code. It is deprecated.
*/

import Room from "./types/Room";
import RoomExit from "./types/RoomExit";
import Waypoint from "./types/Waypoint";
import { ROOM_BACK_ROW_CENTER_Z, ROOM_FRONT_ROW_CENTER_Z, ROOM_MIDDLE_ROW_CENTER_Z } from "./roomSpaceConstants";
import { roomWidthToColumnCount } from "./roomGridUtil";
import Position from "./types/Position";
import { assert, assertNonNullable } from "decent-portal";

export const FLOOR_WAYPOINT_Y_OFFSET = 0.001;
export const WAYPOINT_BACK_ROW_Z = ROOM_BACK_ROW_CENTER_Z;
export const WAYPOINT_MIDDLE_ROW_Z = ROOM_MIDDLE_ROW_CENTER_Z;
export const WAYPOINT_FRONT_ROW_Z = ROOM_FRONT_ROW_CENTER_Z;

function _isExitPositionSupported(roomRect:Room['rect'], exit:RoomExit):boolean {
  if (exit.x === roomRect.x || exit.x === roomRect.x + roomRect.width) return true;
  if (_isAtFloorY(exit.y, roomRect.y + roomRect.height - FLOOR_WAYPOINT_Y_OFFSET)) return true;
  return false;
}

function _isAtFloorY(y:number, floorY:number):boolean {
  return Math.abs(y - floorY) <= FLOOR_WAYPOINT_Y_OFFSET;
}

function _findNearestWaypoint(room:Room, x:number, y:number, z:number,
    predicate?:(waypoint:Waypoint) => boolean):Waypoint {
  let nearestWaypoint:Waypoint|null = null;
  let nearestDistanceSquared = Infinity;
  let nearestRowDistance = Infinity;
  const columnWidth = room.rect.width / roomWidthToColumnCount(room.rect.width);
  room.waypoints.forEach(waypoint => {
    if (predicate && !predicate(waypoint)) return;
    const depthDistance = (waypoint.position.z - z) * columnWidth * 3;
    const distanceSquared = (waypoint.position.x - x) ** 2 + (waypoint.position.y - y) ** 2 + depthDistance ** 2;
    const rowDistance = Math.abs(waypoint.position.z - z);
    if (distanceSquared > nearestDistanceSquared) return;
    if (distanceSquared === nearestDistanceSquared && rowDistance >= nearestRowDistance) return;
    nearestWaypoint = waypoint;
    nearestDistanceSquared = distanceSquared;
    nearestRowDistance = rowDistance;
  });
  if (!nearestWaypoint) throw new Error(`unable to find waypoint in room ${room.id}`);
  return nearestWaypoint;
}

export function findExitWaypoint(roomId:string, roomRect:Room['rect'], exit:RoomExit, waypoints:Waypoint[]):Waypoint {
  assert(_isExitPositionSupported(roomRect, exit), `exit for room ${roomId} at (${exit.x}, ${exit.y}) is not on a supported boundary`);
  const waypoint = waypoints.find(candidate =>
    candidate.position.x === exit.x && candidate.position.y === exit.y && candidate.position.z === WAYPOINT_MIDDLE_ROW_Z);
  assertNonNullable(waypoint, `missing exit waypoint for room ${roomId} at (${exit.x}, ${exit.y})`);
  return waypoint;
}

export function findNearestWaypoint(room:Room, x:number, y:number, predicate?:(waypoint:Waypoint) => boolean):Waypoint {
  return _findNearestWaypoint(room, x, y, WAYPOINT_MIDDLE_ROW_Z, predicate);
}

export function findNearestWaypointToPosition(room:Room, position:Position,
    predicate?:(waypoint:Waypoint) => boolean):Waypoint {
  return _findNearestWaypoint(room, position.x, position.y, position.z, predicate);
}