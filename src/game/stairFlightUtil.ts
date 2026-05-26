import { assert, assertNonNullable } from "decent-portal";

import { FLOOR_WAYPOINT_Y_OFFSET, roomWidthToColumnCount } from "./roomUtil";
import Position from "./types/Position";
import Room from "./types/Room";
import RoomExit from "./types/RoomExit";
import StairFlight, { duplicateStairFlight } from "./types/StairFlight";

const MIN_DIRECT_STAIR_COLUMNS = 5;
const MIN_STAIR_COLUMNS = 4;
const INTERSECTION_TOLERANCE = 0.000001;

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

function _findSortedNonExitFloorPositions(room:Room, floorY:number):Position[] {
  const floorExitXs = new Set(room.exits
    .filter(exit => exit.y === floorY)
    .map(exit => exit.x));
  return room.waypoints
    .filter(waypoint => waypoint.position.y === floorY)
    .map(waypoint => waypoint.position)
    .filter(position => !floorExitXs.has(position.x))
    .sort((left, right) => left.x - right.x);
}

function _calcDirectFlightForExit(room:Room, exit:RoomExit, floorY:number):StairFlight|null {
  const height = floorY - exit.y;
  if (height >= room.rect.width) return null;
  if (exit.x === room.rect.x) return _createStairFlight({ x:exit.x + height, y:floorY }, { x:exit.x, y:exit.y });
  if (exit.x === room.rect.x + room.rect.width) return _createStairFlight({ x:exit.x - height, y:floorY }, { x:exit.x, y:exit.y });
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

function _calcVerticalIntersection(startPosition:Position, boundaryX:number, slope:1|-1):Position|null {
  const rise = (boundaryX - startPosition.x) / slope;
  if (rise <= 0) return null;
  return { x:boundaryX, y:startPosition.y - rise };
}

function _calcTopIntersection(startPosition:Position, topY:number, slope:1|-1):Position|null {
  const rise = startPosition.y - topY;
  if (rise <= 0) return null;
  return { x:startPosition.x + slope * rise, y:topY };
}

function _findCloserFlightEndToFloor(startPosition:Position, boundaryIntersection:Position|null, topIntersection:Position|null):Position|null {
  if (boundaryIntersection && topIntersection) {
    const boundaryRise = startPosition.y - boundaryIntersection.y;
    const topRise = startPosition.y - topIntersection.y;
    return boundaryRise <= topRise ? boundaryIntersection : topIntersection;
  }
  return boundaryIntersection || topIntersection;
}

function _generateWindingStairFlights(room:Room, floorY:number, nonFloorExits:RoomExit[]):StairFlight[] {
  const floorPositions = _findSortedNonExitFloorPositions(room, floorY);
  assert(floorPositions.length >= 2, `room ${room.id} must have at least two non-exit floor waypoints for winding stairs`);
  const stairsTopY = _findHighestNonFloorExitY(nonFloorExits);
  assertNonNullable(stairsTopY, `room ${room.id} must have a non-floor exit when generating winding stairs`);

  const flightLeftX = floorPositions[0].x;
  const flightRightX = floorPositions[floorPositions.length - 1].x;
  let flightStartPosition = { ...floorPositions[0] };
  let slope:1|-1 = 1;
  const flights:StairFlight[] = [];

  while (flightStartPosition.y > stairsTopY) {
    const boundaryX = slope === 1 ? flightRightX : flightLeftX;
    const boundaryIntersection = _calcVerticalIntersection(flightStartPosition, boundaryX, slope);
    const topIntersection = _calcTopIntersection(flightStartPosition, stairsTopY, slope);
    const flightEndPosition = _findCloserFlightEndToFloor(flightStartPosition, boundaryIntersection, topIntersection);
    assertNonNullable(flightEndPosition, `room ${room.id} must produce a winding stair flight end position`);
    flights.push(_createStairFlight(flightStartPosition, flightEndPosition));
    flightStartPosition = { ...flightEndPosition };
    slope = slope === 1 ? -1 : 1;
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