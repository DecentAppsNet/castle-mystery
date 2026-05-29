import { assert, assertNonNullable } from "decent-portal";

import Rect from "./types/Rect";
import Room from "./types/Room";
import Character from "./types/Character";
import RoomExit from "./types/RoomExit";
import StairFlight from "./types/StairFlight";
import Waypoint from "./types/Waypoint";
import ExitStatus from "./types/ExitStatus";
import { normalizeId } from "./idUtil";
import { isPositionInOrOnRect, isPositionInRect } from "./rectUtil";
import { doesStairFlightEndAtPosition, findStairFlightIntersectionAtY, STAIR_POSITION_TOLERANCE } from "./stairUtil";
import { MAP_TILE_SIZE } from "../levelLoading/levelRoomLayoutLoader";

export const COLUMNS_PER_MAP_TILE = 4;
export const FLOOR_WAYPOINT_Y_OFFSET = 0.001;

export function roomWidthToColumnCount(roomWidth: number): number {
  return Math.round(roomWidth / MAP_TILE_SIZE) * COLUMNS_PER_MAP_TILE;
}

function _findAdjacentRoomId(roomId:string, exit:RoomExit):string {
  return exit.room1Id === roomId ? exit.room2Id : exit.room1Id;
}

function _createWaypointKey(x:number, y:number):string {
  return `${x},${y}`;
}

function _findUniqueSortedNumbers(values:number[]):number[] {
  return Array.from(new Set(values)).sort((a, b) => a - b);
}

function _assertExitIsNotOnCeiling(roomId:string, roomRect:Rect, exit:RoomExit):void {
  if (exit.x === roomRect.x || exit.x === roomRect.x + roomRect.width) return;
  assert(
    exit.y !== roomRect.y,
    `ceiling exits are not supported for room ${roomId} at (${exit.x}, ${exit.y})`
  );
}

function _assertExitPositionIsSupported(roomId:string, roomRect:Rect, exit:RoomExit):void {
  if (exit.x === roomRect.x || exit.x === roomRect.x + roomRect.width) return;
  if (exit.y === roomRect.y + roomRect.height - FLOOR_WAYPOINT_Y_OFFSET) return;
  throw new Error(`exit for room ${roomId} at (${exit.x}, ${exit.y}) is not on a supported boundary`);
}

export function findExitWaypoint(roomId:string, roomRect:Rect, exit:RoomExit, waypoints:Waypoint[]):Waypoint {
  _assertExitPositionIsSupported(roomId, roomRect, exit);
  const waypoint = waypoints.find(candidate => candidate.position.x === exit.x && candidate.position.y === exit.y);
  if (!waypoint) throw new Error(`missing exit waypoint for room ${roomId} at (${exit.x}, ${exit.y})`);
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

export function findRoomAtPositionOrTouchingBoundary(rooms:Room[], x:number, y:number):Room | null {
  return rooms.find((room) => isPositionInOrOnRect(x, y, room.rect)) || null;
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
  if (waypoint1 === waypoint2) return;
  if (!waypoint1.adjacentWaypoints.includes(waypoint2)) waypoint1.adjacentWaypoints.push(waypoint2);
  if (!waypoint2.adjacentWaypoints.includes(waypoint1)) waypoint2.adjacentWaypoints.push(waypoint1);
}

function _compareWaypointPositionAlongFlight(flight:StairFlight, waypoint1:Waypoint, waypoint2:Waypoint):number {
  const totalRun = flight.endPosition.x - flight.startPosition.x;
  const totalRise = flight.endPosition.y - flight.startPosition.y;
  if (Math.abs(totalRun) > Math.abs(totalRise)) {
    if (Math.abs(totalRun) <= STAIR_POSITION_TOLERANCE) return 0;
    return (waypoint1.position.x - flight.startPosition.x) / totalRun - (waypoint2.position.x - flight.startPosition.x) / totalRun;
  }
  if (Math.abs(totalRise) <= STAIR_POSITION_TOLERANCE) return 0;
  return (waypoint1.position.y - flight.startPosition.y) / totalRise - (waypoint2.position.y - flight.startPosition.y) / totalRise;
}

function _findNearestWaypointByX(waypoints:Waypoint[], x:number):Waypoint {
  if (!waypoints.length) throw new Error('unable to find nearest waypoint in empty collection');

  let nearestWaypoint = waypoints[0];
  let nearestDistance = Math.abs(waypoints[0].position.x - x);
  for (let i = 1; i < waypoints.length; i++) {
    const distance = Math.abs(waypoints[i].position.x - x);
    if (distance >= nearestDistance) continue;
    nearestWaypoint = waypoints[i];
    nearestDistance = distance;
  }
  return nearestWaypoint;
}

function _findAllNearestWaypointsByX(waypoints:Waypoint[], x:number):Waypoint[] {
  if (!waypoints.length) throw new Error('unable to find nearest waypoint in empty collection');

  let nearestDistance = Infinity;
  const nearestWaypoints:Waypoint[] = [];
  for (const waypoint of waypoints) {
    const distance = Math.abs(waypoint.position.x - x);
    if (distance < nearestDistance - STAIR_POSITION_TOLERANCE) {
      nearestDistance = distance;
      nearestWaypoints.length = 0;
      nearestWaypoints.push(waypoint);
      continue;
    }
    if (Math.abs(distance - nearestDistance) <= STAIR_POSITION_TOLERANCE) nearestWaypoints.push(waypoint);
  }
  return nearestWaypoints;
}

function _findNearestStairIntersectionAtExit(stairs:ReadonlyArray<StairFlight>, exit:RoomExit):{ flight:StairFlight, x:number }|null {
  let nearestIntersection:{ flight:StairFlight, x:number }|null = null;
  let nearestDistance = Infinity;

  for (const stair of stairs) {
    const intersection = findStairFlightIntersectionAtY([stair], exit.y);
    if (!intersection) continue;
    const distance = Math.abs(exit.x - intersection.x);
    if (distance >= nearestDistance - STAIR_POSITION_TOLERANCE) continue;
    nearestIntersection = intersection;
    nearestDistance = distance;
  }

  return nearestIntersection;
}

function _pruneIsolatedNonExitWaypoints(exits:RoomExit[], waypoints:Waypoint[]):Waypoint[] {
  if (exits.length === 0 && waypoints.length <= 1) return waypoints;

  const exitWaypointKeys = new Set(exits.map(exit => _createWaypointKey(exit.x, exit.y)));
  const remainingWaypoints = waypoints.filter(waypoint =>
    waypoint.adjacentWaypoints.length > 0 || exitWaypointKeys.has(_createWaypointKey(waypoint.position.x, waypoint.position.y)));
  if (!remainingWaypoints.length) throw new Error('room has no connected waypoints');
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

export function generateWaypoints(roomId:string, roomRect:Rect, exits:RoomExit[], stairs:ReadonlyArray<StairFlight>|null = null):Waypoint[] {
  const waypointsByKey = new Map<string, Waypoint>();
  const _getOrCreateWaypoint = (x:number, y:number) => {
    const key = _createWaypointKey(x, y);
    const existingWaypoint = waypointsByKey.get(key);
    if (existingWaypoint) return existingWaypoint;
    const waypoint:Waypoint = {
      position: { x, y, z:0 },
      adjacentWaypoints: [] as Readonly<Waypoint>[],
      exitDirections: {}
    };
    waypointsByKey.set(key, waypoint);
    return waypoint;
  };

  exits.forEach(exit => _assertExitIsNotOnCeiling(roomId, roomRect, exit));
  const floorY = roomRect.y + roomRect.height - FLOOR_WAYPOINT_Y_OFFSET;
  const floorExits = exits.filter(exit => exit.y === floorY);
  const nonFloorExits = exits.filter(exit => exit.y !== floorY);

  const columnCount = roomWidthToColumnCount(roomRect.width);
  const columnWidth = roomRect.width / columnCount;
  const floorWaypoints:Waypoint[] = [];

  for (let i = 0; i < columnCount; i++) {
    const x = roomRect.x + (i + 0.5) * columnWidth;
    floorWaypoints.push(_getOrCreateWaypoint(x, floorY));
  }

  exits.forEach(exit => _getOrCreateWaypoint(exit.x, exit.y));

  let waypoints = Array.from(waypointsByKey.values());
  for (let i = 0; i < floorWaypoints.length - 1; i++) {
    _connectWaypoints(floorWaypoints[i], floorWaypoints[i + 1]);
  }

  floorExits.forEach(exit => {
    const exitWaypoint = _getOrCreateWaypoint(exit.x, exit.y);
    const nearestFloorWaypoint = _findNearestWaypointByX(floorWaypoints, exit.x);
    _connectWaypoints(exitWaypoint, nearestFloorWaypoint);
  });

  if (stairs !== null) {
    const waypointsByFlight = new Map<StairFlight, Waypoint[]>();

    stairs.forEach(flight => {
      const startWaypoint = _getOrCreateWaypoint(flight.startPosition.x, flight.startPosition.y);
      const endWaypoint = _getOrCreateWaypoint(flight.endPosition.x, flight.endPosition.y);
      waypointsByFlight.set(flight, [startWaypoint, endWaypoint]);

      if (Math.abs(flight.startPosition.y - floorY) <= STAIR_POSITION_TOLERANCE) {
        _findAllNearestWaypointsByX(floorWaypoints, flight.startPosition.x)
          .forEach(nearestFloorWaypoint => _connectWaypoints(startWaypoint, nearestFloorWaypoint));
      }
    });

    nonFloorExits.forEach(exit => {
      const exitWaypoint = _getOrCreateWaypoint(exit.x, exit.y);
      if (doesStairFlightEndAtPosition(stairs, exitWaypoint.position)) return;

      const stairIntersection = _findNearestStairIntersectionAtExit(stairs, exit);
      assertNonNullable(stairIntersection, `missing stair intersection for room ${roomId} exit at (${exit.x}, ${exit.y})`);
      const landingWaypoint = _getOrCreateWaypoint(stairIntersection.x, exit.y);
      _connectWaypoints(landingWaypoint, exitWaypoint);
      const flightWaypoints = waypointsByFlight.get(stairIntersection.flight);
      assertNonNullable(flightWaypoints, `missing stair waypoint collection for room ${roomId}`);
      flightWaypoints.push(landingWaypoint);
    });

    stairs.forEach(flight => {
      const flightWaypoints = waypointsByFlight.get(flight) || [];
      const sortedFlightWaypoints = [...new Set(flightWaypoints)]
        .sort((waypoint1, waypoint2) => _compareWaypointPositionAlongFlight(flight, waypoint1, waypoint2));
      for (let i = 0; i < sortedFlightWaypoints.length - 1; i++) {
        _connectWaypoints(sortedFlightWaypoints[i], sortedFlightWaypoints[i + 1]);
      }
    });
  } else if (nonFloorExits.length > 0) {
    const roomCenterX = roomRect.x + roomRect.width / 2;
    const nearestFloorWaypoint = _findNearestWaypointByX(floorWaypoints, roomCenterX);
    const spineX = nearestFloorWaypoint.position.x;
    const spineWaypoints = _findUniqueSortedNumbers(nonFloorExits.map(exit => exit.y))
      .map(y => _getOrCreateWaypoint(spineX, y));

    for (let i = 0; i < spineWaypoints.length - 1; i++) {
      _connectWaypoints(spineWaypoints[i], spineWaypoints[i + 1]);
    }

    const floorSpineWaypoint = floorWaypoints.find(waypoint => waypoint.position.x === spineX);
    assertNonNullable(floorSpineWaypoint, `floor waypoint at spine X ${spineX} not found`);
    const lowestSpineWaypoint = spineWaypoints[spineWaypoints.length - 1];
    _connectWaypoints(lowestSpineWaypoint, floorSpineWaypoint);

    nonFloorExits.forEach(exit => {
      const exitWaypoint = _getOrCreateWaypoint(exit.x, exit.y);
      const spineWaypoint = spineWaypoints.find(waypoint => waypoint.position.y === exit.y);
      assertNonNullable(spineWaypoint, `spine waypoint at Y ${exit.y} not found for exit`);
      _connectWaypoints(spineWaypoint, exitWaypoint);
    });
  }

  waypoints = Array.from(waypointsByKey.values());
  waypoints = _pruneIsolatedNonExitWaypoints(exits, waypoints);
  _populateExitDirectionsForRoom(roomId, roomRect, exits, waypoints);

  exits.forEach(exit => {
    const exitWaypoint = findExitWaypoint(roomId, roomRect, exit, waypoints);
    if (!exitWaypoint.adjacentWaypoints.length) {
      throw new Error(`exit waypoint for room ${roomId} at (${exitWaypoint.position.x}, ${exitWaypoint.position.y}) has no connected waypoint`);
    }
  });

  return waypoints;
}