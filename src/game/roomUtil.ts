import Rect from "./types/Rect";
import Room from "./types/Room";
import Character from "./types/Character";
import RoomExit from "./types/RoomExit";
import Obstruction from "./types/Obstruction";
import Waypoint from "./types/Waypoint";
import Position from "./types/Position";
import { clipMoveToObstructions, isPositionInObstructions, isPositionInRect } from "./obstructionUtil";

const WAYPOINT_SPACING = 5;
const EXIT_WAYPOINT_INSET = 3;

function _calcAxisWaypointPositions(start:number, length:number):number[] {
  const waypointCount = Math.max(1, Math.ceil(length / WAYPOINT_SPACING));
  const step = length / waypointCount;
  return Array.from({ length: waypointCount }, (_, index) => Math.round(start + step * (index + 0.5)));
}

function _findAdjacentRoomId(roomId:string, exit:RoomExit):string {
  return exit.room1Id === roomId ? exit.room2Id : exit.room1Id;
}

function _createWaypointKey(x:number, y:number):string {
  return `${x},${y}`;
}

function _findExitWaypointPosition(roomId:string, roomRect:Rect, exit:RoomExit):Position {
  if (exit.x === roomRect.x) return { x: roomRect.x + EXIT_WAYPOINT_INSET, y: exit.y };
  if (exit.x === roomRect.x + roomRect.width) return { x: roomRect.x + roomRect.width - EXIT_WAYPOINT_INSET, y: exit.y };
  if (exit.y === roomRect.y) return { x: exit.x, y: roomRect.y + EXIT_WAYPOINT_INSET };
  if (exit.y === roomRect.y + roomRect.height) return { x: exit.x, y: roomRect.y + roomRect.height - EXIT_WAYPOINT_INSET };
  throw new Error(`exit at (${exit.x}, ${exit.y}) is not on the boundary of room ${roomId}`);
}

function _connectAdjacentWaypoints(waypoints:Waypoint[], obstructions:Obstruction[]) {
  const maxAdjacentDistance = Math.hypot(WAYPOINT_SPACING, WAYPOINT_SPACING);
  const roomForConnectivity:Room = {
    id: "",
    title: "",
    rect: { x:0, y:0, width:0, height:0 },
    items: [],
    obstructions,
    exits: [],
    waypoints: [],
    isDiscovered: false
  };
  waypoints.forEach((waypoint, index) => {
    for (let otherIndex = index + 1; otherIndex < waypoints.length; ++otherIndex) {
      const otherWaypoint = waypoints[otherIndex];
      const distance = Math.hypot(otherWaypoint.position.x - waypoint.position.x, otherWaypoint.position.y - waypoint.position.y);
      if (distance > maxAdjacentDistance) continue;
      const clippedMove = clipMoveToObstructions(roomForConnectivity, waypoint.position, otherWaypoint.position);
      if (clippedMove.position.x !== otherWaypoint.position.x || clippedMove.position.y !== otherWaypoint.position.y) continue;
      waypoint.adjacentWaypoints.push(otherWaypoint);
      otherWaypoint.adjacentWaypoints.push(waypoint);
    }
  });
}

function _pruneIsolatedNonExitWaypoints(roomId:string, roomRect:Rect, exits:RoomExit[], waypoints:Waypoint[]):Waypoint[] {
  const exitWaypointKeys = new Set(exits.map(exit => {
    const position = _findExitWaypointPosition(roomId, roomRect, exit);
    return _createWaypointKey(position.x, position.y);
  }));
  const remainingWaypoints = waypoints.filter(waypoint =>
    waypoint.adjacentWaypoints.length > 0 || exitWaypointKeys.has(_createWaypointKey(waypoint.position.x, waypoint.position.y)));
  if (!remainingWaypoints.length) throw new Error(`room ${roomId} has no connected waypoints`);
  return remainingWaypoints;
}

export function findRoom(rooms:Room[], roomId:string):Room {
  const room = rooms.find((r) => r.id === roomId);
  if (!room) throw new Error(`room with id ${roomId} not found`);
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
  if (!nearestRoom) throw new Error(`unable to find nearest room for (${x}, ${y})`);
  return nearestRoom;
}

export function findCharactersInRoom(room:Room, characters:Character[]):Character[] {
  return characters.filter(character => isPositionInRect(character.x, character.y, room.rect));
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

/*
Algorithm for generating waypoints:

Create a grid of waypoints that is evenly spaced to cover a room rectangle. Each waypoint will have 
connections to adjacent waypoints and exits. "Adjacent" in this case means the distance to the 
waypoint or exit is not larger than the hypotenuse of spacing size. (Another way of saying that
from each waypoint it will be possible to travel to closest orthogonal and diagonal neighbors.)

Remove any waypoint that is inside of an obstruction, removing also any adjacentWaypoints that point to this waypoint.

For every remaining waypoint, test that a path is traversible to all .adjacentWaypoints and .adjacentExits without being blocked by an obstruction.

If any room exits are without a connected waypoint, throw an exception.
*/
function _populateExitDirectionsForRoom(roomId:string, roomRect:Rect, exits:RoomExit[], waypoints:Waypoint[]) {
  exits.forEach(exit => {
    const adjacentRoomId = _findAdjacentRoomId(roomId, exit);
    const exitWaypointPosition = _findExitWaypointPosition(roomId, roomRect, exit);
    const exitWaypoint = waypoints.find(waypoint => waypoint.position.x === exitWaypointPosition.x && waypoint.position.y === exitWaypointPosition.y);
    if (!exitWaypoint) throw new Error(`missing exit waypoint for room ${roomId} toward ${adjacentRoomId}`);
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

export function findExitWaypoint(roomId:string, roomRect:Rect, exit:RoomExit, waypoints:Waypoint[]):Waypoint {
  const position = _findExitWaypointPosition(roomId, roomRect, exit);
  const waypoint = waypoints.find(candidate => candidate.position.x === position.x && candidate.position.y === position.y);
  if (!waypoint) throw new Error(`missing exit waypoint for room ${roomId} at (${position.x}, ${position.y})`);
  return waypoint;
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

export function generateWaypoints(roomId:string, roomRect:Rect, exits:RoomExit[], obstructions:Obstruction[]):Waypoint[] {
  const xPositions = _calcAxisWaypointPositions(roomRect.x, roomRect.width);
  const yPositions = _calcAxisWaypointPositions(roomRect.y, roomRect.height);
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

  yPositions.flatMap(y => xPositions.map(x => ({ x, y })))
    .filter(({ x, y }) => !isPositionInObstructions(x, y, obstructions))
    .forEach(({ x, y }) => { _getOrCreateWaypoint(x, y); });

  exits.forEach(exit => {
    const exitWaypointPosition = _findExitWaypointPosition(roomId, roomRect, exit);
    if (isPositionInObstructions(exitWaypointPosition.x, exitWaypointPosition.y, obstructions)) {
      throw new Error(`exit waypoint for room ${roomId} is obstructed at (${exitWaypointPosition.x}, ${exitWaypointPosition.y})`);
    }
    _getOrCreateWaypoint(exitWaypointPosition.x, exitWaypointPosition.y);
  });

  let waypoints = Array.from(waypointsByKey.values());
  _connectAdjacentWaypoints(waypoints, obstructions);
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