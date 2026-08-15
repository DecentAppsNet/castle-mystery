/* This module groups waypoint-generation helpers for floors, exits, and stairs during level layout setup.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { assert, assertNonNullable } from "decent-portal";

import Rect from "@/game/types/Rect";
import RoomExit from "@/game/types/RoomExit";
import Waypoint from "../types/Waypoint";
import { COLUMN_WIDTH, roomWidthToColumnCount } from "@/game/roomGridUtil";
import { findStairFlightIntersectionAtY, STAIR_POSITION_TOLERANCE } from "@/game/stairUtil";
import { calcExitWaypointY, calcLandingWaypointY, findExitWaypoint, WAYPOINT_BACK_ROW_Z, WAYPOINT_FRONT_ROW_Z, WAYPOINT_MIDDLE_ROW_Z } from "@/levelLoading/activityLoading/waypointFindingUtil";
import { FLOOR_WAYPOINT_Y_OFFSET } from "@/game/roomSpaceConstants";
import Room from "@/game/types/Room";
import Position from "@/game/types/Position";
import StairFlight from "@/game/types/StairFlight";

const FLOOR_ROW_ZS = [WAYPOINT_BACK_ROW_Z, WAYPOINT_MIDDLE_ROW_Z, WAYPOINT_FRONT_ROW_Z] as const;

function _isFloorExit(exit:RoomExit, floorY:number):boolean {
  return calcExitWaypointY(exit) === floorY;
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

export function connectWaypoints(waypoint1:Waypoint, waypoint2:Waypoint) {
  if (waypoint1 === waypoint2) return;
  if (!waypoint1.adjacentWaypoints.includes(waypoint2)) waypoint1.adjacentWaypoints.push(waypoint2);
  if (!waypoint2.adjacentWaypoints.includes(waypoint1)) waypoint2.adjacentWaypoints.push(waypoint1);
}

function _findNearestWaypointByX(waypoints:Waypoint[], x:number):Waypoint {
  assert(waypoints.length > 0);
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
      connectWaypoints(waypointsByRow[rowIndex][columnIndex], waypointsByRow[neighborRowIndex][neighborColumnIndex]);
    }
  }
}

function _findAllNearestWaypointsByX(waypoints:Waypoint[], x:number):Waypoint[] {
  assert(waypoints.length > 0);
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
  assert(waypoints.length > 0);
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
  return stairs.every(flight => flight.startPosition.y === floorY);
}

function _calcWindingWaypointX(roomRect:Rect, x:number):number {
  const columnWidth = roomRect.width / roomWidthToColumnCount(roomRect.width);
  const roomCenterX = roomRect.x + roomRect.width / 2;
  return x < roomCenterX ? x - columnWidth / 2 : x + columnWidth / 2;
}

function _connectWindingStoryWaypoints(roomRect:Rect, bottomLandingY:number, firstFlight:StairFlight, secondFlight:StairFlight,
  getOrCreateWaypoint:(x:number, y:number, z:number) => Waypoint):{ topLandingWaypoint:Waypoint, topMiddleWaypoint:Waypoint } {
  const middleLandingY = calcLandingWaypointY(firstFlight.endPosition.y);
  const topLandingY = calcLandingWaypointY(secondFlight.endPosition.y);
  const bottomBackWaypoint = getOrCreateWaypoint(_calcWindingWaypointX(roomRect, firstFlight.startPosition.x), bottomLandingY, WAYPOINT_BACK_ROW_Z);
  const bottomBackEdgeWaypoint = getOrCreateWaypoint(firstFlight.startPosition.x, bottomLandingY, WAYPOINT_BACK_ROW_Z);
  const midBackEdgeWaypoint = getOrCreateWaypoint(firstFlight.endPosition.x, middleLandingY, WAYPOINT_BACK_ROW_Z);
  const midFrontEdgeWaypoint = getOrCreateWaypoint(secondFlight.startPosition.x, middleLandingY, WAYPOINT_FRONT_ROW_Z);
  const topFrontEdgeWaypoint = getOrCreateWaypoint(secondFlight.endPosition.x, topLandingY, WAYPOINT_FRONT_ROW_Z);
  const topFrontWaypoint = getOrCreateWaypoint(_calcWindingWaypointX(roomRect, secondFlight.endPosition.x), topLandingY, WAYPOINT_FRONT_ROW_Z);
  const topMiddleWaypoint = getOrCreateWaypoint(_calcWindingWaypointX(roomRect, secondFlight.endPosition.x), topLandingY, WAYPOINT_MIDDLE_ROW_Z);

  connectWaypoints(bottomBackWaypoint, bottomBackEdgeWaypoint);
  connectWaypoints(bottomBackEdgeWaypoint, midBackEdgeWaypoint);
  connectWaypoints(midBackEdgeWaypoint, midFrontEdgeWaypoint);
  connectWaypoints(midFrontEdgeWaypoint, topFrontEdgeWaypoint);
  connectWaypoints(topFrontEdgeWaypoint, topFrontWaypoint);
  connectWaypoints(topFrontWaypoint, topMiddleWaypoint);

  return { topLandingWaypoint:topFrontWaypoint, topMiddleWaypoint };
}

function _pruneIsolatedNonExitWaypoints(exits:RoomExit[], waypoints:Waypoint[]):Waypoint[] {
  if (exits.length === 0 && waypoints.length <= 1) return waypoints;

  const exitWaypointKeys = new Set(exits.map(exit => _createWaypointKey(exit.x, calcExitWaypointY(exit), WAYPOINT_MIDDLE_ROW_Z)));
  const remainingWaypoints = waypoints.filter(waypoint =>
    waypoint.adjacentWaypoints.length > 0 || exitWaypointKeys.has(_createWaypointKey(waypoint.position.x, waypoint.position.y, waypoint.position.z)));
  assert(remainingWaypoints.length > 0);
  return remainingWaypoints;
}

function _calcRoomFloorY(roomRect:Rect):number {
  return roomRect.y + roomRect.height - FLOOR_WAYPOINT_Y_OFFSET;
}

function _calcFloorPositionInRoomRect(rect:Rect, col:number, row:number):Position {
  assert(row >= 0 && row < FLOOR_ROW_ZS.length);
  const x = rect.x + (col + 0.5) * COLUMN_WIDTH;
  const y = _calcRoomFloorY(rect);
  const z = FLOOR_ROW_ZS[row];
  return {x, y, z};
}

export function generateWaypoints(roomId:string, roomRect:Rect, exits:RoomExit[], stairs:ReadonlyArray<StairFlight>|null = null):Waypoint[] {
  const waypointsByKey = new Map<string, Waypoint>();
  const _getOrCreateWaypoint = (x:number, y:number, z:number) => {
    const key = _createWaypointKey(x, y, z);
    const existingWaypoint = waypointsByKey.get(key);
    if (existingWaypoint) return existingWaypoint;
    const waypoint:Waypoint = {
      roomId,
      position: { x, y, z },
      adjacentWaypoints: [] as Readonly<Waypoint>[]
    };
    waypointsByKey.set(key, waypoint);
    return waypoint;
  };

  exits.forEach(exit => _assertExitIsNotOnCeiling(roomId, roomRect, exit));
  const floorY = _calcRoomFloorY(roomRect);
  const floorExits = exits.filter(exit => _isFloorExit(exit, floorY));
  const nonFloorExits = exits.filter(exit => !_isFloorExit(exit, floorY));

  const columnCount = roomWidthToColumnCount(roomRect.width);
  const floorWaypointsByRow = FLOOR_ROW_ZS.map(() => [] as Waypoint[]);

  for (let rowIndex = 0; rowIndex < FLOOR_ROW_ZS.length; rowIndex++) {
    for (let columnIndex = 0; columnIndex < columnCount; columnIndex++) {
      const {x, y, z} = _calcFloorPositionInRoomRect(roomRect, columnIndex, rowIndex);
      floorWaypointsByRow[rowIndex].push(_getOrCreateWaypoint(x, y, z));
    }
  }

  const backRowFloorWaypoints = floorWaypointsByRow[0];
  const middleRowFloorWaypoints = floorWaypointsByRow[1];

  exits.forEach(exit => _getOrCreateWaypoint(exit.x, calcExitWaypointY(exit), WAYPOINT_MIDDLE_ROW_Z));

  let waypoints = Array.from(waypointsByKey.values());
  _connectWaypointGridOrthogonallyAndDiagonally(floorWaypointsByRow);

  floorExits.forEach(exit => {
    const exitWaypoint = _getOrCreateWaypoint(exit.x, calcExitWaypointY(exit), WAYPOINT_MIDDLE_ROW_Z);
    const nearestFloorWaypoint = _findNearestWaypointByX(middleRowFloorWaypoints, exit.x);
    connectWaypoints(exitWaypoint, nearestFloorWaypoint);
  });

  if (stairs !== null) {
    if (_areDirectFlights(stairs, floorY)) {
      stairs.forEach(flight => {
        const stairStartWaypoint = _getOrCreateWaypoint(flight.startPosition.x, flight.startPosition.y, WAYPOINT_BACK_ROW_Z);
        const landingWaypoint = _getOrCreateWaypoint(flight.endPosition.x, calcLandingWaypointY(flight.endPosition.y), WAYPOINT_BACK_ROW_Z);
        _findAllNearestWaypointsByX(backRowFloorWaypoints, flight.startPosition.x)
          .forEach(nearestFloorWaypoint => connectWaypoints(stairStartWaypoint, nearestFloorWaypoint));
        connectWaypoints(stairStartWaypoint, landingWaypoint);
      });

      nonFloorExits.forEach(exit => {
        const exitWaypoint = _getOrCreateWaypoint(exit.x, calcExitWaypointY(exit), WAYPOINT_MIDDLE_ROW_Z);
        const stairIntersection = _findNearestStairIntersectionAtExit(stairs, exit);
        assertNonNullable(stairIntersection, `missing stair intersection for room ${roomId} exit at (${exit.x}, ${exit.y})`);
        const landingWaypoint = _getOrCreateWaypoint(stairIntersection.x, calcExitWaypointY(exit), WAYPOINT_BACK_ROW_Z);
        connectWaypoints(landingWaypoint, exitWaypoint);
      });
    } else {
      let previousTopMiddleWaypoint:Waypoint|null = null;
      const topMiddleWaypoints:Waypoint[] = [];

      for (let flightIndex = 0; flightIndex < stairs.length; flightIndex += 2) {
        const firstFlight:StairFlight|undefined = stairs[flightIndex];
        const secondFlight:StairFlight|undefined = stairs[flightIndex + 1];
        assertNonNullable(firstFlight, `missing winding back-row flight for room ${roomId}`);
        assertNonNullable(secondFlight, `missing winding front-row flight for room ${roomId}`);
        const bottomLandingY = previousTopMiddleWaypoint?.position.y ?? firstFlight.startPosition.y;
        const currentBottomBackWaypoint = _getOrCreateWaypoint(_calcWindingWaypointX(roomRect, firstFlight.startPosition.x), bottomLandingY, WAYPOINT_BACK_ROW_Z);
        const { topMiddleWaypoint } = _connectWindingStoryWaypoints(roomRect, bottomLandingY, firstFlight, secondFlight, _getOrCreateWaypoint);
        topMiddleWaypoints.push(topMiddleWaypoint);

        if (previousTopMiddleWaypoint !== null) {
          connectWaypoints(previousTopMiddleWaypoint, currentBottomBackWaypoint);
        } else if (firstFlight.startPosition.y === floorY) {
          _findAllNearestWaypointsByX(backRowFloorWaypoints, firstFlight.startPosition.x)
            .forEach(nearestFloorWaypoint => connectWaypoints(currentBottomBackWaypoint, nearestFloorWaypoint));
        }

        previousTopMiddleWaypoint = topMiddleWaypoint;
      }

      nonFloorExits.forEach(exit => {
        const exitWaypoint = _getOrCreateWaypoint(exit.x, calcExitWaypointY(exit), WAYPOINT_MIDDLE_ROW_Z);
        const topMiddleWaypoint = topMiddleWaypoints.length > 0 ? _findNearestWaypointByY(topMiddleWaypoints, calcExitWaypointY(exit)) : null;
        assertNonNullable(topMiddleWaypoint, `missing winding top middle waypoint for room ${roomId} exit at (${exit.x}, ${exit.y})`);
        connectWaypoints(topMiddleWaypoint, exitWaypoint);
      });
    }
  } else if (nonFloorExits.length > 0) {
    const roomCenterX = roomRect.x + roomRect.width / 2;
    const nearestFloorWaypoint = _findNearestWaypointByX(middleRowFloorWaypoints, roomCenterX);
    const spineX = nearestFloorWaypoint.position.x;
    const spineWaypoints = _findUniqueSortedNumbers(nonFloorExits.map(calcExitWaypointY))
      .map(y => _getOrCreateWaypoint(spineX, y, WAYPOINT_MIDDLE_ROW_Z));

    for (let i = 0; i < spineWaypoints.length - 1; i++) {
      connectWaypoints(spineWaypoints[i], spineWaypoints[i + 1]);
    }

    const floorSpineWaypoint = middleRowFloorWaypoints.find(waypoint => waypoint.position.x === spineX);
    assertNonNullable(floorSpineWaypoint, `floor waypoint at spine X ${spineX} not found`);
    const lowestSpineWaypoint = spineWaypoints[spineWaypoints.length - 1];
    connectWaypoints(lowestSpineWaypoint, floorSpineWaypoint);

    nonFloorExits.forEach(exit => {
      const exitWaypoint = _getOrCreateWaypoint(exit.x, calcExitWaypointY(exit), WAYPOINT_MIDDLE_ROW_Z);
      const spineWaypoint = spineWaypoints.find(waypoint => waypoint.position.y === calcExitWaypointY(exit));
      assertNonNullable(spineWaypoint, `spine waypoint at Y ${exit.y} not found for exit`);
      connectWaypoints(spineWaypoint, exitWaypoint);
    });
  }

  waypoints = Array.from(waypointsByKey.values());
  waypoints = _pruneIsolatedNonExitWaypoints(exits, waypoints);

  exits.forEach(exit => {
    const exitWaypoint = findExitWaypoint(roomId, roomRect, exit, waypoints);
    assert(exitWaypoint.adjacentWaypoints.length > 0);
  });

  return waypoints;
}

export function calcFloorPositionInRoom(room:Room, col:number, row:number):Position {
  return _calcFloorPositionInRoomRect(room.rect, col, row);
}