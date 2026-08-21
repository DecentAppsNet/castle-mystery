/* This module groups waypoint constants and lookup helpers used by level loading.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import Room from "@/game/types/Room";
import Waypoint from "../types/Waypoint";
import { FLOOR_WAYPOINT_Y_OFFSET, ROOM_BACK_ROW_CENTER_Z, ROOM_FRONT_ROW_CENTER_Z, ROOM_MIDDLE_ROW_CENTER_Z } from "@/game/roomSpaceConstants";
import Position from "@/game/types/Position";
import { arePositionsEqual } from "@/game/positionUtil";
import { assert, assertNonNullable } from "decent-portal";
import RoomExit from "@/game/types/RoomExit";
import WaypointGenerationContext from "../types/WaypointGenerationContext";
import TimelineKeyframe from "@/game/types/TimelineKeyframe";
import Item from "@/game/types/Item";
import CharacterKeyframe from "@/game/types/CharacterKeyframe";

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

function _findRoomItemPositions(items:Item[]):Position[] {
  return items.filter(i => i.isVisible).map(i => i.position);
}

function _isPositionInWaypoints(position:Position, waypoints:Waypoint[]):boolean {
  return waypoints.find(w => arePositionsEqual(w.position, position)) !== undefined;
}

function _isPositionInPositions(position:Position, positions:Position[]):boolean {
  return positions.find(p => arePositionsEqual(p, position)) !== undefined;
}

function _findRoomCharacterPositions(characterKeyframes:CharacterKeyframe[], roomWaypoints:Waypoint[]):Position[] {
  return characterKeyframes
    .filter(c => c.isVisible && _isPositionInWaypoints(c.position, roomWaypoints))
    .map(c => c.position);
}

export function isFloorWaypoint(room:Room, waypoint:Waypoint):boolean {
  return waypoint.position.y === room.rect.y + room.rect.height - FLOOR_WAYPOINT_Y_OFFSET;
}

export function isExitWaypoint(room:Room, waypoint:Waypoint):boolean {
  return waypoint.position.z === WAYPOINT_MIDDLE_ROW_Z
    && room.exits.some(exit => exit.x === waypoint.position.x && calcExitWaypointY(exit) === waypoint.position.y);
}

function _findRoomFloorWaypoints(room:Room, waypointContext:WaypointGenerationContext):Waypoint[] {
  const roomWaypoints = waypointContext.waypointsByRoomId.get(room.id);
  assertNonNullable(roomWaypoints);
  return roomWaypoints.filter(w => isFloorWaypoint(room, w) && !isExitWaypoint(room, w));
}

function _findBackRowFloorWaypoints(room:Room, waypointContext:WaypointGenerationContext):Waypoint[] {
  const roomWaypoints = waypointContext.waypointsByRoomId.get(room.id);
  assertNonNullable(roomWaypoints);
  return roomWaypoints.filter(w => w.position.z === WAYPOINT_BACK_ROW_Z && isFloorWaypoint(room, w)); // Back row criteria already excludes room exits.
}

function _findWaypointAtPosition(waypoints:Waypoint[], position:Position):Waypoint|null {
  return waypoints.find(w => arePositionsEqual(position, w.position)) ?? null;
}

export function findExitWaypoint(roomId:string, roomRect:Room['rect'], exit:RoomExit, waypoints:Waypoint[]):Waypoint {
  assert(_isExitPositionSupported(roomRect, exit), `exit for room ${roomId} at (${exit.x}, ${exit.y}) is not on a supported boundary`);
  const waypoint = waypoints.find(candidate =>
    candidate.position.x === exit.x && candidate.position.y === calcExitWaypointY(exit) && candidate.position.z === WAYPOINT_MIDDLE_ROW_Z);
  assertNonNullable(waypoint, `missing exit waypoint for room ${roomId} at (${exit.x}, ${exit.y})`);
  return waypoint;
}

export function findWaypointsForRoom(context:WaypointGenerationContext, roomId:string):Waypoint[] {
  const waypoints = context.waypointsByRoomId.get(roomId);
  assertNonNullable(waypoints, `missing waypoints for room ${roomId}`);
  return waypoints;
}

export function findNearestFloorWaypointToPosition(context:WaypointGenerationContext, room:Room, position:Position):Waypoint {
  const floorY = room.rect.y + room.rect.height - FLOOR_WAYPOINT_Y_OFFSET;
  const waypoint = _findNearestXZWaypoint(findWaypointsForRoom(context, room.id), position.x, floorY, position.z, []);
  assertNonNullable(waypoint);
  return waypoint;
}

export function findNearestIncludedFloorWaypointToPosition(context:WaypointGenerationContext, room:Room, position:Position,
    excludedWaypoints:Waypoint[]):Waypoint|null {
  const floorY = room.rect.y + room.rect.height - FLOOR_WAYPOINT_Y_OFFSET;
  return _findNearestXZWaypoint(findWaypointsForRoom(context, room.id), position.x, floorY, position.z, excludedWaypoints);
}

export function findNearestIncludedFloorBackRowWaypointToPosition(context:WaypointGenerationContext, room:Room, position:Position,
    excludedWaypoints:Waypoint[]):Waypoint|null {
  const floorY = room.rect.y + room.rect.height - FLOOR_WAYPOINT_Y_OFFSET;
  const waypoints = _findBackRowFloorWaypoints(room, context);
  return _findNearestXZWaypoint(waypoints, position.x, floorY, position.z, excludedWaypoints);
}

export function findRoomWaypointAtPosition(waypointContext:WaypointGenerationContext, roomId:string, position:Position):Waypoint|null {
  const waypoints = waypointContext.waypointsByRoomId.get(roomId);
  assertNonNullable(waypoints);
  return _findWaypointAtPosition(waypoints, position);
}

// Returns an array of unclaimed waypoints in a specified room. Unclaimed means no visible character or item
// is positioned at a waypoint. Room exit and non-floor waypoints are excluded.
export function findClaimedWaypointsFromKeyframe(room:Room, roomI:number, keyframe:TimelineKeyframe, 
    waypointContext:WaypointGenerationContext):Waypoint[] {
  const waypoints:Waypoint[] = _findRoomFloorWaypoints(room, waypointContext);
  const roomKeyframe = keyframe.rooms[roomI];
  assertNonNullable(roomKeyframe);
  const roomItemPositions = _findRoomItemPositions(roomKeyframe.items);
  const roomCharacterPositions = _findRoomCharacterPositions(keyframe.characters, waypoints);
  const claimedPositions:Position[] = roomItemPositions.concat(roomCharacterPositions);
  return waypoints.filter(w => _isPositionInPositions(w.position, claimedPositions));
}