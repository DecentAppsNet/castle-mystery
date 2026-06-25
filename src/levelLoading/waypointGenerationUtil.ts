/* This module groups waypoint-generation helpers for floors, exits, and stairs during level layout setup.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { assert, assertNonNullable } from "decent-portal";

import Rect from "@/game/types/Rect";
import RoomExit from "@/game/types/RoomExit";
import StairFlight from "@/game/types/StairFlight";
import Waypoint from "@/game/types/Waypoint";
import { roomWidthToColumnCount } from "@/game/roomGridUtil";
import { findStairFlightIntersectionAtY, STAIR_POSITION_TOLERANCE } from "@/game/stairUtil";
import {
  FLOOR_WAYPOINT_Y_OFFSET,
  findExitWaypoint,
  WAYPOINT_BACK_ROW_Z,
  WAYPOINT_FRONT_ROW_Z,
  WAYPOINT_MIDDLE_ROW_Z,
} from "@/game/waypointUtil";

const FLOOR_ROW_ZS = [WAYPOINT_BACK_ROW_Z, WAYPOINT_MIDDLE_ROW_Z, WAYPOINT_FRONT_ROW_Z] as const;

function _isAtFloorY(y:number, floorY:number):boolean {
  return Math.abs(y - floorY) <= FLOOR_WAYPOINT_Y_OFFSET + STAIR_POSITION_TOLERANCE;
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
      _connectWaypointGridNeighbors(waypointsByRow, rowIndex, columnIndex, false);
      _connectWaypointGridNeighbors(waypointsByRow, rowIndex, columnIndex, true);
    }
  }
}

function _connectWaypointGridNeighbors(waypointsByRow:Waypoint[][], rowIndex:number, columnIndex:number, diagonalOnly:boolean) {
  for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
    for (let columnOffset = -1; columnOffset <= 1; columnOffset++) {
      if (rowOffset === 0 && columnOffset === 0) continue;
      const isDiagonalNeighbor = rowOffset !== 0 && columnOffset !== 0;
      if (diagonalOnly !== isDiagonalNeighbor) continue;
      const neighborRowIndex = rowIndex + rowOffset;
      const neighborColumnIndex = columnIndex + columnOffset;
      if (neighborRowIndex < 0 || neighborRowIndex >= waypointsByRow.length) continue;
      if (neighborColumnIndex < 0 || neighborColumnIndex >= waypointsByRow[neighborRowIndex].length) continue;
      _connectWaypoints(waypointsByRow[rowIndex][columnIndex], waypointsByRow[neighborRowIndex][neighborColumnIndex]);
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
  const bottomBackEdgeWaypoint = getOrCreateWaypoint(firstFlight.startPosition.x, firstFlight.startPosition.y, WAYPOINT_BACK_ROW_Z);
  const midBackEdgeWaypoint = getOrCreateWaypoint(firstFlight.endPosition.x, firstFlight.endPosition.y, WAYPOINT_BACK_ROW_Z);
  const midFrontEdgeWaypoint = getOrCreateWaypoint(secondFlight.startPosition.x, secondFlight.startPosition.y, WAYPOINT_FRONT_ROW_Z);
  const topFrontEdgeWaypoint = getOrCreateWaypoint(secondFlight.endPosition.x, secondFlight.endPosition.y, WAYPOINT_FRONT_ROW_Z);
  const topFrontWaypoint = getOrCreateWaypoint(_calcWindingWaypointX(roomRect, secondFlight.endPosition.x), secondFlight.endPosition.y, WAYPOINT_FRONT_ROW_Z);
  const topMiddleWaypoint = getOrCreateWaypoint(_calcWindingWaypointX(roomRect, secondFlight.endPosition.x), secondFlight.endPosition.y, WAYPOINT_MIDDLE_ROW_Z);

  _connectWaypoints(bottomBackWaypoint, bottomBackEdgeWaypoint);
  _connectWaypoints(bottomBackEdgeWaypoint, midBackEdgeWaypoint);
  _connectWaypoints(midBackEdgeWaypoint, midFrontEdgeWaypoint);
  _connectWaypoints(midFrontEdgeWaypoint, topFrontEdgeWaypoint);
  _connectWaypoints(topFrontEdgeWaypoint, topFrontWaypoint);
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

function _sortWaypointsForExitTraversal(waypoints:ReadonlyArray<Waypoint>):Waypoint[] {
  return [...waypoints].sort((waypoint1, waypoint2) => {
    const middleRowDistance1 = Math.abs(waypoint1.position.z - WAYPOINT_MIDDLE_ROW_Z);
    const middleRowDistance2 = Math.abs(waypoint2.position.z - WAYPOINT_MIDDLE_ROW_Z);
    if (middleRowDistance1 !== middleRowDistance2) return middleRowDistance1 - middleRowDistance2;
    if (waypoint1.position.y !== waypoint2.position.y) return waypoint2.position.y - waypoint1.position.y;
    if (waypoint1.position.x !== waypoint2.position.x) return waypoint2.position.x - waypoint1.position.x;
    return waypoint1.position.z - waypoint2.position.z;
  });
}

function _populateExitDirectionsForRoom(roomId:string, roomRect:Rect, exits:RoomExit[], waypoints:Waypoint[]) {
  exits.forEach(exit => {
    const adjacentRoomId = _findAdjacentRoomId(roomId, exit);
    const exitWaypoint = findExitWaypoint(roomId, roomRect, exit, waypoints);
    const visited = new Set<string>([_createWaypointKey(exitWaypoint.position.x, exitWaypoint.position.y, exitWaypoint.position.z)]);
    const pending:Waypoint[] = [exitWaypoint];

    while (pending.length > 0) {
      const currentWaypoint = pending.shift()!;
      _sortWaypointsForExitTraversal(currentWaypoint.adjacentWaypoints).forEach(adjacentWaypoint => {
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