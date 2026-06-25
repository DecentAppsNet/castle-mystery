/* This module groups waypoint constants and lookup helpers used by room navigation and authored placement logic.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import Room from "./types/Room";
import RoomExit from "./types/RoomExit";
import Waypoint from "./types/Waypoint";
import { ROOM_BACK_ROW_CENTER_Z, ROOM_FRONT_ROW_CENTER_Z, ROOM_MIDDLE_ROW_CENTER_Z } from "./roomSpaceConstants";
import { roomWidthToColumnCount } from "./roomGridUtil";

export const FLOOR_WAYPOINT_Y_OFFSET = 0.001;
export const WAYPOINT_BACK_ROW_Z = ROOM_BACK_ROW_CENTER_Z;
export const WAYPOINT_MIDDLE_ROW_Z = ROOM_MIDDLE_ROW_CENTER_Z;
export const WAYPOINT_FRONT_ROW_Z = ROOM_FRONT_ROW_CENTER_Z;

export function findExitWaypoint(roomId:string, roomRect:Room['rect'], exit:RoomExit, waypoints:Waypoint[]):Waypoint {
  _assertExitPositionIsSupported(roomId, roomRect, exit);
  const waypoint = waypoints.find(candidate =>
    candidate.position.x === exit.x && candidate.position.y === exit.y && candidate.position.z === WAYPOINT_MIDDLE_ROW_Z);
  if (!waypoint) throw new Error(`missing exit waypoint for room ${roomId} at (${exit.x}, ${exit.y})`);
  return waypoint;
}

export function findNearestWaypoint(room:Room, x:number, y:number, predicate?:(waypoint:Waypoint) => boolean):Waypoint {
  return _findNearestWaypoint(room, x, y, null, predicate);
}

export function findNearestWaypointToPosition(room:Room, position:Pick<Waypoint['position'], 'x'|'y'|'z'>,
  predicate?:(waypoint:Waypoint) => boolean):Waypoint {
  return _findNearestWaypoint(room, position.x, position.y, position.z, predicate);
}

function _isAtFloorY(y:number, floorY:number):boolean {
  return Math.abs(y - floorY) <= FLOOR_WAYPOINT_Y_OFFSET;
}

function _assertExitPositionIsSupported(roomId:string, roomRect:Room['rect'], exit:RoomExit):void {
  if (exit.x === roomRect.x || exit.x === roomRect.x + roomRect.width) return;
  if (_isAtFloorY(exit.y, roomRect.y + roomRect.height - FLOOR_WAYPOINT_Y_OFFSET)) return;
  throw new Error(`exit for room ${roomId} at (${exit.x}, ${exit.y}) is not on a supported boundary`);
}

function _findNearestWaypoint(room:Room, x:number, y:number, z:number|null,
  predicate?:(waypoint:Waypoint) => boolean):Waypoint {
  let nearestWaypoint:Waypoint|null = null;
  let nearestDistanceSquared = Infinity;
  let nearestRowDistance = Infinity;
  const columnWidth = room.rect.width / roomWidthToColumnCount(room.rect.width);
  room.waypoints.forEach(waypoint => {
    if (predicate && !predicate(waypoint)) return;
    const depthDistance = z === null ? 0 : (waypoint.position.z - z) * columnWidth * 3;
    const distanceSquared = (waypoint.position.x - x) ** 2 + (waypoint.position.y - y) ** 2 + depthDistance ** 2;
    const rowDistance = z === null
      ? Math.abs(waypoint.position.z - WAYPOINT_MIDDLE_ROW_Z)
      : Math.abs(waypoint.position.z - z);
    if (distanceSquared > nearestDistanceSquared) return;
    if (distanceSquared === nearestDistanceSquared && rowDistance >= nearestRowDistance) return;
    nearestWaypoint = waypoint;
    nearestDistanceSquared = distanceSquared;
    nearestRowDistance = rowDistance;
  });
  if (!nearestWaypoint) throw new Error(`unable to find waypoint in room ${room.id}`);
  return nearestWaypoint;
}