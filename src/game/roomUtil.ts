import { assertNonNullable } from "decent-portal";

import Rect from "./types/Rect";
import Room from "./types/Room";
import Character from "./types/Character";
import RoomExit from "./types/RoomExit";
import Waypoint from "./types/Waypoint";
import Position from "./types/Position";
import ExitStatus from "./types/ExitStatus";
import { normalizeId } from "./idUtil";
import { isPositionInRect } from "./rectUtil";

const EXIT_WAYPOINT_INSET = 5;
export const FLOOR_WAYPOINT_Y_OFFSET = 0.001;

function _findAdjacentRoomId(roomId:string, exit:RoomExit):string {
  return exit.room1Id === roomId ? exit.room2Id : exit.room1Id;
}

function _createWaypointKey(x:number, y:number):string {
  return `${x},${y}`;
}

function _findUniqueSortedNumbers(values:number[]):number[] {
  return Array.from(new Set(values)).sort((a, b) => a - b);
}

function _clampExitWaypointAxis(value:number, minValue:number, maxValue:number):number {
  return Math.min(maxValue, Math.max(minValue, value));
}

function _findExitWaypointPosition(roomId:string, roomRect:Rect, exit:RoomExit):Position {
  const minX = roomRect.x + EXIT_WAYPOINT_INSET;
  const maxX = roomRect.x + roomRect.width - EXIT_WAYPOINT_INSET;
  const minY = roomRect.y + EXIT_WAYPOINT_INSET;
  const maxY = roomRect.y + roomRect.height - FLOOR_WAYPOINT_Y_OFFSET;

  if (exit.x === roomRect.x) return { x: minX, y: exit.y === roomRect.y ? minY : (exit.y === roomRect.y + roomRect.height ? maxY : exit.y) };
  if (exit.x === roomRect.x + roomRect.width) return { x: maxX, y: exit.y === roomRect.y ? minY : (exit.y === roomRect.y + roomRect.height ? maxY : exit.y) };
  if (exit.y === roomRect.y) return { x: _clampExitWaypointAxis(exit.x, minX, maxX), y: minY };
  if (exit.y === roomRect.y + roomRect.height) return { x: _clampExitWaypointAxis(exit.x, minX, maxX), y: maxY };
  throw new Error(`exit at (${exit.x}, ${exit.y}) is not on the boundary of room ${roomId}`);
}

function _findExitBoundaryWaypointPosition(roomId:string, roomRect:Rect, exit:RoomExit):Position {
  if (exit.x === roomRect.x || exit.x === roomRect.x + roomRect.width || exit.y === roomRect.y || exit.y === roomRect.y + roomRect.height) {
    return { x: exit.x, y: exit.y };
  }
  throw new Error(`exit at (${exit.x}, ${exit.y}) is not on the boundary of room ${roomId}`);
}

export function findExitWaypoint(roomId:string, roomRect:Rect, exit:RoomExit, waypoints:Waypoint[]):Waypoint {
  const position = _findExitWaypointPosition(roomId, roomRect, exit);
  const waypoint = waypoints.find(candidate => candidate.position.x === position.x && candidate.position.y === position.y);
  if (!waypoint) throw new Error(`missing exit waypoint for room ${roomId} at (${position.x}, ${position.y})`);
  return waypoint;
}

export function findRoom(rooms:Room[], roomRef:string):Room {
  const roomId = normalizeId(roomRef);
  const room = rooms.find((r) => r.id === roomId);
  if (!room) throw new Error(`room with id ${roomRef} not found`);
  return room;
}

export function findRoomAtPosition(rooms:Room[], x:number, y:number):Room | null {
  return rooms.find((r) => isPositionInRect(x, y, r.rect)) || null;
}

export function findRoomNearestToPosition(rooms:Room[], x:number, y:number):Room {
  if (!rooms.length) throw new Error('there should be at least one room in the level');
  let nearestRoom:Room|null = null;
  let nearestDistanceSquared = Infinity;
  for (const room of rooms) {
    const centerX = room.rect.x + room.rect.width / 2;
    const centerY = room.rect.y + room.rect.height / 2;
    const distanceSquared = (centerX - x) ** 2 + (centerY - y) ** 2;
    if (distanceSquared < nearestDistanceSquared) {
      nearestRoom = room;
      nearestDistanceSquared = distanceSquared;
    }
  }
  assertNonNullable(nearestRoom, `unable to find nearest room for (${x}, ${y})`);
  return nearestRoom;
}

export function findCharactersInRoom(room:Room, characters:Character[]):Character[] {
  return characters.filter(character => isPositionInRect(character.x, character.y, room.rect));
}

export function isActiveAudibleRoom(room:Room, activeRoom:Room):boolean {
  if (room.id === activeRoom.id) return true;
  if (room.isObscured) return false;
  return room.exits.some(exit =>
    exit.exitStatus === ExitStatus.open
    && (exit.room1Id === activeRoom.id || exit.room2Id === activeRoom.id));
}

export function calcRoomsBoundingRect(rooms:Room[]):Rect {
  if (!rooms.length) throw new Error('cannot calculate room bounds with no rooms');
  let leftX = rooms[0].rect.x, rightX = leftX + rooms[0].rect.width,
      topY = rooms[0].rect.y, bottomY = topY + rooms[0].rect.height;
  for (let i = 1; i < rooms.length; i++) {
    const room = rooms[i];
    leftX = Math.min(leftX, room.rect.x);
    rightX = Math.max(rightX, room.rect.x + room.rect.width);
    topY = Math.min(topY, room.rect.y);
    bottomY = Math.max(bottomY, room.rect.y + room.rect.height);
  }
  return {x:leftX, y:topY, width:rightX - leftX, height:bottomY - topY};
}

export function findNearestWaypoint(room:Room, x:number, y:number, predicate?:(waypoint:Waypoint) => boolean):Waypoint {
  let nearestWaypoint:Waypoint|null = null;
  let nearestDistanceSquared = Infinity;
  room.waypoints.forEach(waypoint => {
    if (predicate && !predicate(waypoint)) return;
    const distanceSquared = (waypoint.position.x - x) ** 2 + (waypoint.position.y - y) ** 2;
    if (distanceSquared >= nearestDistanceSquared) return;
    nearestWaypoint = waypoint;
    nearestDistanceSquared = distanceSquared;
  });
  if (!nearestWaypoint) throw new Error(`unable to find waypoint in room ${room.id}`);
  return nearestWaypoint;
}

function _connectWaypoints(waypoint1:Waypoint, waypoint2:Waypoint) {
  if (!waypoint1.adjacentWaypoints.includes(waypoint2)) waypoint1.adjacentWaypoints.push(waypoint2);
  if (!waypoint2.adjacentWaypoints.includes(waypoint1)) waypoint2.adjacentWaypoints.push(waypoint1);
}

function _connectOrthogonalNearestWaypoints(waypoints:Waypoint[]) {
  waypoints.forEach(waypoint => {
    let nearestLeft:Waypoint|null = null;
    let nearestRight:Waypoint|null = null;
    let nearestUp:Waypoint|null = null;
    let nearestDown:Waypoint|null = null;
    let nearestLeftDistance = Number.POSITIVE_INFINITY;
    let nearestRightDistance = Number.POSITIVE_INFINITY;
    let nearestUpDistance = Number.POSITIVE_INFINITY;
    let nearestDownDistance = Number.POSITIVE_INFINITY;

    waypoints.forEach(candidate => {
      if (candidate === waypoint) return;

      if (candidate.position.y === waypoint.position.y) {
        const xDistance = candidate.position.x - waypoint.position.x;
        if (xDistance < 0 && Math.abs(xDistance) < nearestLeftDistance) {
          nearestLeft = candidate;
          nearestLeftDistance = Math.abs(xDistance);
        }
        if (xDistance > 0 && xDistance < nearestRightDistance) {
          nearestRight = candidate;
          nearestRightDistance = xDistance;
        }
      }

      if (candidate.position.x === waypoint.position.x) {
        const yDistance = candidate.position.y - waypoint.position.y;
        if (yDistance < 0 && Math.abs(yDistance) < nearestUpDistance) {
          nearestUp = candidate;
          nearestUpDistance = Math.abs(yDistance);
        }
        if (yDistance > 0 && yDistance < nearestDownDistance) {
          nearestDown = candidate;
          nearestDownDistance = yDistance;
        }
      }
    });

    [nearestLeft, nearestRight, nearestUp, nearestDown].forEach(candidate => {
      if (candidate) _connectWaypoints(waypoint, candidate);
    });
  });
}

function _pruneIsolatedNonExitWaypoints(roomId:string, roomRect:Rect, exits:RoomExit[], waypoints:Waypoint[]):Waypoint[] {
  if (exits.length === 0 && waypoints.length <= 1) return waypoints;

  const exitWaypointKeys = new Set(exits.flatMap(exit => {
    const boundaryPosition = _findExitBoundaryWaypointPosition(roomId, roomRect, exit);
    const frontPosition = _findExitWaypointPosition(roomId, roomRect, exit);
    return [_createWaypointKey(boundaryPosition.x, boundaryPosition.y), _createWaypointKey(frontPosition.x, frontPosition.y)];
  }));
  const remainingWaypoints = waypoints.filter(waypoint =>
    waypoint.adjacentWaypoints.length > 0 || exitWaypointKeys.has(_createWaypointKey(waypoint.position.x, waypoint.position.y)));
  if (!remainingWaypoints.length) throw new Error(`room ${roomId} has no connected waypoints`);
  return remainingWaypoints;
}


function _populateExitDirectionsForRoom(roomId:string, roomRect:Rect, exits:RoomExit[], waypoints:Waypoint[]) {
  exits.forEach(exit => {
    const adjacentRoomId = _findAdjacentRoomId(roomId, exit);
    const exitWaypoint = findExitWaypoint(roomId, roomRect, exit, waypoints);
    const visited = new Set<string>([_createWaypointKey(exitWaypoint.position.x, exitWaypoint.position.y)]);
    const pending:Waypoint[] = [exitWaypoint];

    while (pending.length > 0) {
      const currentWaypoint = pending.shift()!;
      currentWaypoint.adjacentWaypoints.forEach(adjacentWaypoint => {
        const key = _createWaypointKey(adjacentWaypoint.position.x, adjacentWaypoint.position.y);
        if (visited.has(key)) return;
        visited.add(key);
        adjacentWaypoint.exitDirections[adjacentRoomId] = currentWaypoint;
        pending.push(adjacentWaypoint);
      });
    }
  });
}

export function generateWaypoints(roomId:string, roomRect:Rect, exits:RoomExit[]):Waypoint[] {
  const waypointsByKey = new Map<string, Waypoint>();
  const _getOrCreateWaypoint = (x:number, y:number) => {
    const key = _createWaypointKey(x, y);
    const existingWaypoint = waypointsByKey.get(key);
    if (existingWaypoint) return existingWaypoint;
    const waypoint:Waypoint = {
      position: { x, y },
      adjacentWaypoints: [] as Readonly<Waypoint>[],
      exitDirections: {}
    };
    waypointsByKey.set(key, waypoint);
    return waypoint;
  };

  const northExits = exits.filter(exit => exit.y === roomRect.y);
  const spineXs = northExits.length > 0
    ? _findUniqueSortedNumbers(northExits.map(exit => exit.x))
    : [Math.round(roomRect.x + roomRect.width / 2)];
  const frontWaypointPositions = exits.map(exit => _findExitWaypointPosition(roomId, roomRect, exit));
  const spineYs = frontWaypointPositions.length > 0
    ? _findUniqueSortedNumbers(frontWaypointPositions.map(position => position.y))
    : [Math.round(roomRect.y + roomRect.height / 2)];

  exits.forEach(exit => {
    const boundaryPosition = _findExitBoundaryWaypointPosition(roomId, roomRect, exit);
    const frontPosition = _findExitWaypointPosition(roomId, roomRect, exit);
    _getOrCreateWaypoint(boundaryPosition.x, boundaryPosition.y);
    _getOrCreateWaypoint(frontPosition.x, frontPosition.y);
  });

  spineXs.flatMap(x => spineYs.map(y => ({ x, y }))).forEach(({ x, y }) => {
    _getOrCreateWaypoint(x, y);
  });

  let waypoints = Array.from(waypointsByKey.values());
  _connectOrthogonalNearestWaypoints(waypoints);
  waypoints = _pruneIsolatedNonExitWaypoints(roomId, roomRect, exits, waypoints);
  _populateExitDirectionsForRoom(roomId, roomRect, exits, waypoints);

  exits.forEach(exit => {
    const exitWaypoint = findExitWaypoint(roomId, roomRect, exit, waypoints);
    if (!exitWaypoint.adjacentWaypoints.length) {
      throw new Error(`exit waypoint for room ${roomId} at (${exitWaypoint.position.x}, ${exitWaypoint.position.y}) has no connected waypoint`);
    }
  });

  return waypoints;
}