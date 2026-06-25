/* This module groups stair-flight generation helpers that derive traversable stair segments from room geometry.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { assert, assertNonNullable } from "decent-portal";

import { MAP_TILE_SIZE, roomWidthToColumnCount } from "./roomGridUtil";
import { FLOOR_WAYPOINT_Y_OFFSET } from "./waypointUtil";
import Position from "./types/Position";
import Room from "./types/Room";
import RoomExit from "./types/RoomExit";
import StairFlight, { duplicateStairFlight } from "./types/StairFlight";
import { ROOM_BACK_Z } from "./roomSpaceConstants";

const MIN_DIRECT_STAIR_COLUMNS = 5;
const MIN_STAIR_COLUMNS = 4;
const WINDING_ACTIVE_COLUMNS = 4;
const WINDING_FLIGHT_WIDTH_COLUMNS = 2;
const INTERSECTION_TOLERANCE = 0.000001;
const BACK_ROW_Z = ROOM_BACK_Z;

function _createStairFlight(startPosition:Position, endPosition:Position):StairFlight {
  return duplicateStairFlight({ startPosition, endPosition });
}

function _calcFloorY(room:Room):number {
  return room.rect.y + room.rect.height - FLOOR_WAYPOINT_Y_OFFSET;
}

function _findSortedNonFloorExits(room:Room, floorY:number):RoomExit[] {
  return [...room.exits]
    .filter(exit => exit.y < floorY)
    .sort((left, right) => left.y - right.y || left.x - right.x);
}

function _calcDirectFlightForExit(room:Room, exit:RoomExit, floorY:number):StairFlight|null {
  const height = floorY - exit.y;
  const columnWidth = room.rect.width / roomWidthToColumnCount(room.rect.width);
  if (height + columnWidth >= room.rect.width) return null;
  if (exit.x === room.rect.x) return _createStairFlight({ x:exit.x + height + columnWidth, y:floorY, z:BACK_ROW_Z }, { x:exit.x + columnWidth, y:exit.y, z:BACK_ROW_Z });
  if (exit.x === room.rect.x + room.rect.width) return _createStairFlight({ x:exit.x - height - columnWidth, y:floorY, z:BACK_ROW_Z }, { x:exit.x - columnWidth, y:exit.y, z:BACK_ROW_Z });
  throw new Error(`exit for room ${room.id} at (${exit.x}, ${exit.y}) is not on a supported wall`);
}

function _calcOrientation(position1:Position, position2:Position, position3:Position):number {
  const crossProduct = (position2.y - position1.y) * (position3.x - position2.x)
    - (position2.x - position1.x) * (position3.y - position2.y);
  if (Math.abs(crossProduct) <= INTERSECTION_TOLERANCE) return 0;
  return crossProduct > 0 ? 1 : -1;
}

function _isPositionOnSegment(startPosition:Position, candidatePosition:Position, endPosition:Position):boolean {
  return candidatePosition.x <= Math.max(startPosition.x, endPosition.x) + INTERSECTION_TOLERANCE
    && candidatePosition.x + INTERSECTION_TOLERANCE >= Math.min(startPosition.x, endPosition.x)
    && candidatePosition.y <= Math.max(startPosition.y, endPosition.y) + INTERSECTION_TOLERANCE
    && candidatePosition.y + INTERSECTION_TOLERANCE >= Math.min(startPosition.y, endPosition.y);
}

function _doStairFlightsIntersect(flight1:StairFlight, flight2:StairFlight):boolean {
  const orientation1 = _calcOrientation(flight1.startPosition, flight1.endPosition, flight2.startPosition);
  const orientation2 = _calcOrientation(flight1.startPosition, flight1.endPosition, flight2.endPosition);
  const orientation3 = _calcOrientation(flight2.startPosition, flight2.endPosition, flight1.startPosition);
  const orientation4 = _calcOrientation(flight2.startPosition, flight2.endPosition, flight1.endPosition);

  if (orientation1 !== orientation2 && orientation3 !== orientation4) return true;
  if (orientation1 === 0 && _isPositionOnSegment(flight1.startPosition, flight2.startPosition, flight1.endPosition)) return true;
  if (orientation2 === 0 && _isPositionOnSegment(flight1.startPosition, flight2.endPosition, flight1.endPosition)) return true;
  if (orientation3 === 0 && _isPositionOnSegment(flight2.startPosition, flight1.startPosition, flight2.endPosition)) return true;
  if (orientation4 === 0 && _isPositionOnSegment(flight2.startPosition, flight1.endPosition, flight2.endPosition)) return true;
  return false;
}

function _tryGenerateDirectStairFlights(room:Room, floorY:number, nonFloorExits:RoomExit[]):StairFlight[]|null {
  if (roomWidthToColumnCount(room.rect.width) < MIN_DIRECT_STAIR_COLUMNS) return null;

  const flights:StairFlight[] = [];
  for (const exit of nonFloorExits) {
    const flight = _calcDirectFlightForExit(room, exit, floorY);
    if (!flight) return null;
    if (flights.some(existingFlight => _doStairFlightsIntersect(existingFlight, flight))) return null;
    flights.push(flight);
  }
  return flights;
}

function _findHighestNonFloorExitY(nonFloorExits:RoomExit[]):number|null {
  if (!nonFloorExits.length) return null;
  return Math.min(...nonFloorExits.map(exit => exit.y));
}

function _calcWindingFlightColumnBounds(room:Room):{ leftX:number, rightX:number } {
  const columnCount = roomWidthToColumnCount(room.rect.width);
  assert(columnCount % 2 === 0, `room ${room.id} must have an even number of columns for winding stairs`);
  const columnWidth = room.rect.width / columnCount;
  const activeLeftX = room.rect.x + room.rect.width / 2 - WINDING_ACTIVE_COLUMNS / 2 * columnWidth;
  return {
    leftX: activeLeftX + columnWidth,
    rightX: activeLeftX + (columnWidth * (1 + WINDING_FLIGHT_WIDTH_COLUMNS))
  };
}

function _calcWindingStoryCount(room:Room, stairsTopY:number):number {
  const roomBottomY = room.rect.y + room.rect.height;
  const rawStoryCount = (roomBottomY - stairsTopY) / MAP_TILE_SIZE;
  const storyCount = Math.round(rawStoryCount);
  const alignedTopY = roomBottomY - storyCount * MAP_TILE_SIZE;
  assert(Math.abs(stairsTopY - alignedTopY) <= FLOOR_WAYPOINT_Y_OFFSET + INTERSECTION_TOLERANCE,
    `room ${room.id} non-floor exits must align with whole-story heights`);
  return storyCount;
}

function _calcWindingFlightStartY(room:Room, floorY:number, halfFlightIndex:number):number {
  if (halfFlightIndex === 0) return floorY;
  return room.rect.y + room.rect.height - halfFlightIndex * MAP_TILE_SIZE / 2;
}

function _calcWindingFlightEndY(room:Room, halfFlightIndex:number, flightCount:number, stairsTopY:number):number {
  if (halfFlightIndex === flightCount - 1) return stairsTopY;
  return room.rect.y + room.rect.height - (halfFlightIndex + 1) * MAP_TILE_SIZE / 2;
}

function _generateWindingStairFlights(room:Room, floorY:number, nonFloorExits:RoomExit[]):StairFlight[] {
  const stairsTopY = _findHighestNonFloorExitY(nonFloorExits);
  assertNonNullable(stairsTopY, `room ${room.id} must have a non-floor exit when generating winding stairs`);
  const { leftX, rightX } = _calcWindingFlightColumnBounds(room);
  const storyCount = _calcWindingStoryCount(room, stairsTopY);
  const flightCount = storyCount * 2;
  const flights:StairFlight[] = [];

  for (let halfFlightIndex = 0; halfFlightIndex < flightCount; halfFlightIndex++) {
    const isBackRowFlight = halfFlightIndex % 2 === 0;
    const startY = _calcWindingFlightStartY(room, floorY, halfFlightIndex);
    const endY = _calcWindingFlightEndY(room, halfFlightIndex, flightCount, stairsTopY);
    flights.push(_createStairFlight(
      { x: isBackRowFlight ? leftX : rightX, y:startY, z:BACK_ROW_Z },
      { x: isBackRowFlight ? rightX : leftX, y:endY, z:BACK_ROW_Z }
    ));
  }
  return flights;
}

export function generateStairFlights(room:Room):StairFlight[] {
  const floorY = _calcFloorY(room);
  const nonFloorExits = _findSortedNonFloorExits(room, floorY);
  if (!nonFloorExits.length) return [];

  assert(roomWidthToColumnCount(room.rect.width) >= MIN_STAIR_COLUMNS, `room ${room.id} must be at least ${MIN_STAIR_COLUMNS} columns wide for stairs`);
  const directFlights = _tryGenerateDirectStairFlights(room, floorY, nonFloorExits);
  if (directFlights) return directFlights;
  return _generateWindingStairFlights(room, floorY, nonFloorExits);
}