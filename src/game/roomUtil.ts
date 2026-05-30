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
import { findStairFlightIntersectionAtY, STAIR_POSITION_TOLERANCE } from "./stairUtil";
import { MAP_TILE_SIZE } from "../levelLoading/levelRoomLayoutLoader";

export const COLUMNS_PER_MAP_TILE = 4;
export const FLOOR_WAYPOINT_Y_OFFSET = 0.001;
export const WAYPOINT_BACK_ROW_Z = 0.1667;
export const WAYPOINT_MIDDLE_ROW_Z = 0.5;
export const WAYPOINT_FRONT_ROW_Z = 0.8333;

const FLOOR_ROW_ZS = [WAYPOINT_BACK_ROW_Z, WAYPOINT_MIDDLE_ROW_Z, WAYPOINT_FRONT_ROW_Z] as const;

function _isAtFloorY(y:number, floorY:number):boolean {
  return Math.abs(y - floorY) <= FLOOR_WAYPOINT_Y_OFFSET + STAIR_POSITION_TOLERANCE;
}

export function roomWidthToColumnCount(roomWidth: number): number {
  return Math.round(roomWidth / MAP_TILE_SIZE) * COLUMNS_PER_MAP_TILE;
}

function _findAdjacentRoomId(roomId:string, exit:RoomExit):string {
  return exit.room1Id === roomId ? exit.room2Id : exit.room1Id;
}

function _createWaypointKey(x:number, y:number, z:number):string {
  return `${x},${y},${z}`;
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
  if (_isAtFloorY(exit.y, roomRect.y + roomRect.height - FLOOR_WAYPOINT_Y_OFFSET)) return;
  throw new Error(`exit for room ${roomId} at (${exit.x}, ${exit.y}) is not on a supported boundary`);
}

export function findExitWaypoint(roomId:string, roomRect:Rect, exit:RoomExit, waypoints:Waypoint[]):Waypoint {
  _assertExitPositionIsSupported(roomId, roomRect, exit);
  const waypoint = waypoints.find(candidate =>
    candidate.position.x === exit.x && candidate.position.y === exit.y && candidate.position.z === WAYPOINT_MIDDLE_ROW_Z);
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
  return _findNearestWaypoint(room, x, y, null, predicate);
}

export function findNearestWaypointToPosition(room:Room, position:Pick<Waypoint['position'], 'x'|'y'|'z'>,
  predicate?:(waypoint:Waypoint) => boolean):Waypoint {
  return _findNearestWaypoint(room, position.x, position.y, position.z, predicate);
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

function _connectWaypoints(waypoint1:Waypoint, waypoint2:Waypoint) {
  if (waypoint1 === waypoint2) return;
  if (!waypoint1.adjacentWaypoints.includes(waypoint2)) waypoint1.adjacentWaypoints.push(waypoint2);
  if (!waypoint2.adjacentWaypoints.includes(waypoint1)) waypoint2.adjacentWaypoints.push(waypoint1);
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

function _connectWaypointGridOrthogonallyAndDiagonally(waypointsByRow:Waypoint[][]) {
  for (let rowIndex = 0; rowIndex < waypointsByRow.length; rowIndex++) {
    for (let columnIndex = 0; columnIndex < waypointsByRow[rowIndex].length; columnIndex++) {
      for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
        for (let columnOffset = -1; columnOffset <= 1; columnOffset++) {
          if (rowOffset === 0 && columnOffset === 0) continue;
          const neighborRowIndex = rowIndex + rowOffset;
          const neighborColumnIndex = columnIndex + columnOffset;
          if (neighborRowIndex < 0 || neighborRowIndex >= waypointsByRow.length) continue;
          if (neighborColumnIndex < 0 || neighborColumnIndex >= waypointsByRow[neighborRowIndex].length) continue;
          _connectWaypoints(waypointsByRow[rowIndex][columnIndex], waypointsByRow[neighborRowIndex][neighborColumnIndex]);
        }
      }
    }
  }
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

function _findNearestWaypointByY(waypoints:Waypoint[], y:number):Waypoint {
  if (!waypoints.length) throw new Error('unable to find nearest waypoint in empty collection');

  let nearestWaypoint = waypoints[0];
  let nearestDistance = Math.abs(waypoints[0].position.y - y);
  for (let i = 1; i < waypoints.length; i++) {
    const distance = Math.abs(waypoints[i].position.y - y);
    if (distance >= nearestDistance) continue;
    nearestWaypoint = waypoints[i];
    nearestDistance = distance;
  }
  return nearestWaypoint;
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

function _areDirectFlights(stairs:ReadonlyArray<StairFlight>, floorY:number):boolean {
  return stairs.every(flight => Math.abs(flight.startPosition.y - floorY) <= STAIR_POSITION_TOLERANCE);
}

function _calcWindingWaypointX(roomRect:Rect, x:number):number {
  const columnWidth = roomRect.width / roomWidthToColumnCount(roomRect.width);
  const roomCenterX = roomRect.x + roomRect.width / 2;
  return x < roomCenterX ? x - columnWidth / 2 : x + columnWidth / 2;
}

function _connectWindingStoryWaypoints(roomRect:Rect, firstFlight:StairFlight, secondFlight:StairFlight,
  getOrCreateWaypoint:(x:number, y:number, z:number) => Waypoint):{ topLandingWaypoint:Waypoint, topMiddleWaypoint:Waypoint } {
  const bottomBackWaypoint = getOrCreateWaypoint(_calcWindingWaypointX(roomRect, firstFlight.startPosition.x), firstFlight.startPosition.y, WAYPOINT_BACK_ROW_Z);
  const midBackWaypoint = getOrCreateWaypoint(_calcWindingWaypointX(roomRect, firstFlight.endPosition.x), firstFlight.endPosition.y, WAYPOINT_BACK_ROW_Z);
  const midFrontWaypoint = getOrCreateWaypoint(_calcWindingWaypointX(roomRect, secondFlight.startPosition.x), secondFlight.startPosition.y, WAYPOINT_FRONT_ROW_Z);
  const topFrontWaypoint = getOrCreateWaypoint(_calcWindingWaypointX(roomRect, secondFlight.endPosition.x), secondFlight.endPosition.y, WAYPOINT_FRONT_ROW_Z);
  const topMiddleWaypoint = getOrCreateWaypoint(_calcWindingWaypointX(roomRect, secondFlight.endPosition.x), secondFlight.endPosition.y, WAYPOINT_MIDDLE_ROW_Z);

  _connectWaypoints(bottomBackWaypoint, midBackWaypoint);
  _connectWaypoints(midBackWaypoint, midFrontWaypoint);
  _connectWaypoints(midFrontWaypoint, topFrontWaypoint);
  _connectWaypoints(topFrontWaypoint, topMiddleWaypoint);

  return { topLandingWaypoint:topFrontWaypoint, topMiddleWaypoint };
}

function _pruneIsolatedNonExitWaypoints(exits:RoomExit[], waypoints:Waypoint[]):Waypoint[] {
  if (exits.length === 0 && waypoints.length <= 1) return waypoints;

  const exitWaypointKeys = new Set(exits.map(exit => _createWaypointKey(exit.x, exit.y, WAYPOINT_MIDDLE_ROW_Z)));
  const remainingWaypoints = waypoints.filter(waypoint =>
    waypoint.adjacentWaypoints.length > 0 || exitWaypointKeys.has(_createWaypointKey(waypoint.position.x, waypoint.position.y, waypoint.position.z)));
  if (!remainingWaypoints.length) throw new Error('room has no connected waypoints');
  return remainingWaypoints;
}


function _populateExitDirectionsForRoom(roomId:string, roomRect:Rect, exits:RoomExit[], waypoints:Waypoint[]) {
  exits.forEach(exit => {
    const adjacentRoomId = _findAdjacentRoomId(roomId, exit);
    const exitWaypoint = findExitWaypoint(roomId, roomRect, exit, waypoints);
    const visited = new Set<string>([_createWaypointKey(exitWaypoint.position.x, exitWaypoint.position.y, exitWaypoint.position.z)]);
    const pending:Waypoint[] = [exitWaypoint];

    while (pending.length > 0) {
      const currentWaypoint = pending.shift()!;
      currentWaypoint.adjacentWaypoints.forEach(adjacentWaypoint => {
        const key = _createWaypointKey(adjacentWaypoint.position.x, adjacentWaypoint.position.y, adjacentWaypoint.position.z);
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
  const _getOrCreateWaypoint = (x:number, y:number, z:number) => {
    const key = _createWaypointKey(x, y, z);
    const existingWaypoint = waypointsByKey.get(key);
    if (existingWaypoint) return existingWaypoint;
    const waypoint:Waypoint = {
      position: { x, y, z },
      adjacentWaypoints: [] as Readonly<Waypoint>[],
      exitDirections: {}
    };
    waypointsByKey.set(key, waypoint);
    return waypoint;
  };

  exits.forEach(exit => _assertExitIsNotOnCeiling(roomId, roomRect, exit));
  const floorY = roomRect.y + roomRect.height - FLOOR_WAYPOINT_Y_OFFSET;
  const floorExits = exits.filter(exit => _isAtFloorY(exit.y, floorY));
  const nonFloorExits = exits.filter(exit => !_isAtFloorY(exit.y, floorY));

  const columnCount = roomWidthToColumnCount(roomRect.width);
  const columnWidth = roomRect.width / columnCount;
  const floorWaypointsByRow = FLOOR_ROW_ZS.map(() => [] as Waypoint[]);

  for (let rowIndex = 0; rowIndex < FLOOR_ROW_ZS.length; rowIndex++) {
    for (let columnIndex = 0; columnIndex < columnCount; columnIndex++) {
      const x = roomRect.x + (columnIndex + 0.5) * columnWidth;
      floorWaypointsByRow[rowIndex].push(_getOrCreateWaypoint(x, floorY, FLOOR_ROW_ZS[rowIndex]));
    }
  }

  const backRowFloorWaypoints = floorWaypointsByRow[0];
  const middleRowFloorWaypoints = floorWaypointsByRow[1];

  exits.forEach(exit => _getOrCreateWaypoint(exit.x, exit.y, WAYPOINT_MIDDLE_ROW_Z));

  let waypoints = Array.from(waypointsByKey.values());
  _connectWaypointGridOrthogonallyAndDiagonally(floorWaypointsByRow);

  floorExits.forEach(exit => {
    const exitWaypoint = _getOrCreateWaypoint(exit.x, exit.y, WAYPOINT_MIDDLE_ROW_Z);
    const nearestFloorWaypoint = _findNearestWaypointByX(middleRowFloorWaypoints, exit.x);
    _connectWaypoints(exitWaypoint, nearestFloorWaypoint);
  });

  if (stairs !== null) {
    if (_areDirectFlights(stairs, floorY)) {
      stairs.forEach(flight => {
        const stairStartWaypoint = _getOrCreateWaypoint(flight.startPosition.x, flight.startPosition.y, WAYPOINT_BACK_ROW_Z);
        const landingWaypoint = _getOrCreateWaypoint(flight.endPosition.x, flight.endPosition.y, WAYPOINT_BACK_ROW_Z);
        _findAllNearestWaypointsByX(backRowFloorWaypoints, flight.startPosition.x)
          .forEach(nearestFloorWaypoint => _connectWaypoints(stairStartWaypoint, nearestFloorWaypoint));
        _connectWaypoints(stairStartWaypoint, landingWaypoint);
      });

      nonFloorExits.forEach(exit => {
        const exitWaypoint = _getOrCreateWaypoint(exit.x, exit.y, WAYPOINT_MIDDLE_ROW_Z);
        const stairIntersection = _findNearestStairIntersectionAtExit(stairs, exit);
        assertNonNullable(stairIntersection, `missing stair intersection for room ${roomId} exit at (${exit.x}, ${exit.y})`);
        const landingWaypoint = _getOrCreateWaypoint(stairIntersection.x, exit.y, WAYPOINT_BACK_ROW_Z);
        _connectWaypoints(landingWaypoint, exitWaypoint);
      });
    } else {
      let previousTopMiddleWaypoint:Waypoint|null = null;
      const topMiddleWaypoints:Waypoint[] = [];

      for (let flightIndex = 0; flightIndex < stairs.length; flightIndex += 2) {
        const firstFlight:StairFlight|undefined = stairs[flightIndex];
        const secondFlight:StairFlight|undefined = stairs[flightIndex + 1];
        assertNonNullable(firstFlight, `missing winding back-row flight for room ${roomId}`);
        assertNonNullable(secondFlight, `missing winding front-row flight for room ${roomId}`);
        const currentBottomBackWaypoint = _getOrCreateWaypoint(_calcWindingWaypointX(roomRect, firstFlight.startPosition.x), firstFlight.startPosition.y, WAYPOINT_BACK_ROW_Z);
        const { topMiddleWaypoint } = _connectWindingStoryWaypoints(roomRect, firstFlight, secondFlight, _getOrCreateWaypoint);
        topMiddleWaypoints.push(topMiddleWaypoint);

        if (previousTopMiddleWaypoint !== null) {
          _connectWaypoints(previousTopMiddleWaypoint, currentBottomBackWaypoint);
        } else if (Math.abs(firstFlight.startPosition.y - floorY) <= STAIR_POSITION_TOLERANCE) {
          _findAllNearestWaypointsByX(backRowFloorWaypoints, firstFlight.startPosition.x)
            .forEach(nearestFloorWaypoint => _connectWaypoints(currentBottomBackWaypoint, nearestFloorWaypoint));
        }

        previousTopMiddleWaypoint = topMiddleWaypoint;
      }

      nonFloorExits.forEach(exit => {
        const exitWaypoint = _getOrCreateWaypoint(exit.x, exit.y, WAYPOINT_MIDDLE_ROW_Z);
        const topMiddleWaypoint = topMiddleWaypoints.length > 0 ? _findNearestWaypointByY(topMiddleWaypoints, exit.y) : null;
        assertNonNullable(topMiddleWaypoint, `missing winding top middle waypoint for room ${roomId} exit at (${exit.x}, ${exit.y})`);
        _connectWaypoints(topMiddleWaypoint, exitWaypoint);
      });
    }
  } else if (nonFloorExits.length > 0) {
    const roomCenterX = roomRect.x + roomRect.width / 2;
    const nearestFloorWaypoint = _findNearestWaypointByX(middleRowFloorWaypoints, roomCenterX);
    const spineX = nearestFloorWaypoint.position.x;
    const spineWaypoints = _findUniqueSortedNumbers(nonFloorExits.map(exit => exit.y))
      .map(y => _getOrCreateWaypoint(spineX, y, WAYPOINT_MIDDLE_ROW_Z));

    for (let i = 0; i < spineWaypoints.length - 1; i++) {
      _connectWaypoints(spineWaypoints[i], spineWaypoints[i + 1]);
    }

    const floorSpineWaypoint = middleRowFloorWaypoints.find(waypoint => waypoint.position.x === spineX);
    assertNonNullable(floorSpineWaypoint, `floor waypoint at spine X ${spineX} not found`);
    const lowestSpineWaypoint = spineWaypoints[spineWaypoints.length - 1];
    _connectWaypoints(lowestSpineWaypoint, floorSpineWaypoint);

    nonFloorExits.forEach(exit => {
      const exitWaypoint = _getOrCreateWaypoint(exit.x, exit.y, WAYPOINT_MIDDLE_ROW_Z);
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