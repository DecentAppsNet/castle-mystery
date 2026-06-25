/* This module groups stair-part generation helpers that expand stair flights into drawable room stair geometry.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { roomWidthToColumnCount } from "./roomGridUtil";
import { FLOOR_WAYPOINT_Y_OFFSET } from "./waypointUtil";
import { doesStairFlightEndAtPosition, findStairFlightIntersectionAtY, STAIR_POSITION_TOLERANCE } from "./stairUtil";
import Position from "./types/Position";
import Room from "./types/Room";
import RoomExit from "./types/RoomExit";
import StairPart, { StairLandingType, StairPartType } from "./types/StairPart";
import StairFlight from "./types/StairFlight";
import { ROOM_BACK_Z, ROOM_FRONT_ROW_MIN_Z, ROOM_FULL_DEPTH, ROOM_MIDDLE_ROW_MIN_Z, ROOM_ROW_DEPTH } from "./roomSpaceConstants";

const BACK_ROW_Z = ROOM_BACK_Z;
const FRONT_ROW_Z = ROOM_FRONT_ROW_MIN_Z;
const STAIR_CUBOID_DEPTH = ROOM_ROW_DEPTH;
const LANDING_CUBOID_DEPTH = ROOM_FRONT_ROW_MIN_Z;
const MIDDLE_ROW_Z = ROOM_MIDDLE_ROW_MIN_Z;
const PREFERRED_STEP_RISE_RUN = 1;

function _getStairAngleTolerance():number {
  return FLOOR_WAYPOINT_Y_OFFSET + STAIR_POSITION_TOLERANCE;
}

function _calcStairStepCount(totalDistance:number):number {
  return Math.max(1, Math.round(totalDistance / PREFERRED_STEP_RISE_RUN));
}

function _calcStairStepHeight(fromPosition:Position, toPosition:Position):number {
  const totalRise = Math.abs(toPosition.y - fromPosition.y);
  const stepCount = _calcStairStepCount(Math.max(totalRise, Math.abs(toPosition.x - fromPosition.x)));
  return totalRise / stepCount;
}

function _calcRoomFloorY(room:Room):number {
  return room.rect.y + room.rect.height - FLOOR_WAYPOINT_Y_OFFSET;
}

function _findSortedNonFloorExits(room:Room, floorY:number):RoomExit[] {
  return [...room.exits]
    .filter(exit => exit.y < floorY)
    .sort((left, right) => left.y - right.y || left.x - right.x);
}

function _snapFlightTo45DegreesForDrawing(fromPosition:Position, toPosition:Position):{ fromPosition:Position, toPosition:Position } {
  const totalRise = toPosition.y - fromPosition.y;
  const totalRun = toPosition.x - fromPosition.x;
  const riseMagnitude = Math.abs(totalRise);
  const runMagnitude = Math.abs(totalRun);
  if (Math.abs(riseMagnitude - runMagnitude) > _getStairAngleTolerance()) return { fromPosition, toPosition };
  return {
    fromPosition,
    toPosition:{
      x:toPosition.x,
      y:fromPosition.y + Math.sign(totalRise) * runMagnitude,
      z:toPosition.z
    }
  };
}

function _findNearestStairIntersectionAtExit(flights:StairFlight[], exit:RoomExit) {
  let nearestIntersection:null|{ flight:StairFlight, x:number } = null;
  let nearestDistance = Infinity;

  for (const flight of flights) {
    const intersection = findStairFlightIntersectionAtY([flight], exit.y);
    if (intersection === null) continue;
    const distance = Math.abs(exit.x - intersection.x);
    if (distance >= nearestDistance - STAIR_POSITION_TOLERANCE) continue;
    nearestIntersection = intersection;
    nearestDistance = distance;
  }

  return nearestIntersection;
}

function _areDirectFlights(flights:StairFlight[], floorY:number):boolean {
  return flights.every(flight => Math.abs(flight.startPosition.y - floorY) <= STAIR_POSITION_TOLERANCE);
}

function _createDirectLandingPart(stairIntersectionX:number, exit:RoomExit, height:number, landingType:StairLandingType):StairPart {
  return {
    type:StairPartType.landing,
    landingType,
    leftX:Math.min(exit.x, stairIntersectionX),
    topY:exit.y,
    width:Math.abs(exit.x - stairIntersectionX),
    height,
    z:BACK_ROW_Z,
    depth:LANDING_CUBOID_DEPTH
  };
}

function _createCatwalkPart(leftX:number, topY:number, width:number, height:number, z:number, depth:number):StairPart|null {
  if (width <= STAIR_POSITION_TOLERANCE) return null;
  return {
    type:StairPartType.catwalk,
    leftX,
    topY,
    width,
    height,
    z,
    depth
  };
}

function _createFlightPart(flight:StairFlight, z:number):StairPart {
  return {
    type:StairPartType.flight,
    startPosition:flight.startPosition,
    endPosition:flight.endPosition,
    z
  };
}

function _createDirectParts(room:Room, exits:RoomExit[], flights:StairFlight[]):StairPart[] {
  const stairParts:StairPart[] = [];
  exits.forEach((exit, exitIndex) => {
    const flight = flights[exitIndex];
    if (flight === undefined) return;
    if (doesStairFlightEndAtPosition(flights, { x:exit.x, y:exit.y, z:BACK_ROW_Z })) return;
    const stairIntersection = _findNearestStairIntersectionAtExit(flights, exit);
    if (stairIntersection === null) return;
    const stairIntersectionX = stairIntersection.x;
    const stepHeight = _calcStairStepHeight(stairIntersection.flight.startPosition, stairIntersection.flight.endPosition);
    const landingPart = _createDirectLandingPart(stairIntersectionX, exit, stepHeight,
      exit.x === room.rect.x ? StairLandingType.directLeft : StairLandingType.directRight);
    const flightPart = _createFlightPart(flight, BACK_ROW_Z);
    if (exit.x === room.rect.x) {
      stairParts.push(flightPart, landingPart);
      return;
    }
    stairParts.push(landingPart, flightPart);
  });
  return stairParts;
}

function _createWindingMidStoryLandingParts(room:Room, flights:StairFlight[]):StairPart[] {
  const columnWidth = room.rect.width / roomWidthToColumnCount(room.rect.width);
  const stairParts:StairPart[] = [];

  for (let flightIndex = 0; flightIndex + 1 < flights.length; flightIndex += 2) {
    const firstFlight = _snapFlightTo45DegreesForDrawing(flights[flightIndex].startPosition, flights[flightIndex].endPosition);
    const landingLeftX = Math.max(firstFlight.fromPosition.x, firstFlight.toPosition.x);
    const landingTopY = Math.min(firstFlight.fromPosition.y, firstFlight.toPosition.y);
    const landingHeight = _calcStairStepHeight(firstFlight.fromPosition, firstFlight.toPosition);
    stairParts.push({
      type:StairPartType.landing,
      landingType:StairLandingType.midStory,
      leftX:landingLeftX,
      topY:landingTopY,
      width:columnWidth,
      height:landingHeight,
      z:BACK_ROW_Z,
      depth:ROOM_FULL_DEPTH
    });
  }

  return stairParts;
}

function _hasExitAtStoryY(room:Room, storyY:number, wallX:number):boolean {
  return room.exits.some(exit =>
    Math.abs(exit.x - wallX) <= STAIR_POSITION_TOLERANCE
    && Math.abs(exit.y - storyY) <= _getStairAngleTolerance());
}

function _createWindingStoryLandingParts(room:Room, flights:StairFlight[]):{ rightCatwalkParts:StairPart[], trailingStoryParts:StairPart[] } {
  const columnWidth = room.rect.width / roomWidthToColumnCount(room.rect.width);
  const roomLeftX = room.rect.x;
  const roomRightX = room.rect.x + room.rect.width;
  const isWiderThanOneStoryTile = roomWidthToColumnCount(room.rect.width) > 4;
  const rightCatwalkParts:StairPart[] = [];
  const trailingStoryParts:StairPart[] = [];

  for (let flightIndex = 1; flightIndex < flights.length; flightIndex += 2) {
    const secondFlight = _snapFlightTo45DegreesForDrawing(flights[flightIndex].startPosition, flights[flightIndex].endPosition);
    const landingLeftX = Math.min(secondFlight.fromPosition.x, secondFlight.toPosition.x) - columnWidth;
    const landingTopY = Math.min(secondFlight.fromPosition.y, secondFlight.toPosition.y);
    const landingHeight = _calcStairStepHeight(secondFlight.fromPosition, secondFlight.toPosition);
    const storyY = flights[flightIndex].endPosition.y;
    const areStairsContinuing = flightIndex + 1 < flights.length;
    const isLeftExitPresent = _hasExitAtStoryY(room, storyY, roomLeftX);
    const isRightExitPresent = _hasExitAtStoryY(room, storyY, roomRightX);
    const leftLandingZ = areStairsContinuing ? BACK_ROW_Z : MIDDLE_ROW_Z;
    const leftLandingDepth = areStairsContinuing ? ROOM_FULL_DEPTH : LANDING_CUBOID_DEPTH;
    const rightCatwalkPart = _createCatwalkPart(landingLeftX + columnWidth, landingTopY, roomRightX - (landingLeftX + columnWidth), landingHeight,
      MIDDLE_ROW_Z, STAIR_CUBOID_DEPTH);
    const leftCatwalkPart = _createCatwalkPart(roomLeftX, landingTopY, landingLeftX - roomLeftX, landingHeight,
      leftLandingZ, STAIR_CUBOID_DEPTH);

    if (isRightExitPresent && rightCatwalkPart !== null) rightCatwalkParts.push(rightCatwalkPart);

    trailingStoryParts.push({
      type:StairPartType.landing,
      landingType:areStairsContinuing ? StairLandingType.fullStory : StairLandingType.terminalStory,
      leftX:landingLeftX,
      topY:landingTopY,
      width:columnWidth,
      height:landingHeight,
      z:leftLandingZ,
      depth:leftLandingDepth
    });

    if (isWiderThanOneStoryTile && isLeftExitPresent && leftCatwalkPart !== null) trailingStoryParts.push(leftCatwalkPart);
  }

  return { rightCatwalkParts, trailingStoryParts };
}

export function generateStairParts(room:Room, flights:StairFlight[]):StairPart[] {
  if (!flights.length) return [];

  const floorY = _calcRoomFloorY(room);
  if (_areDirectFlights(flights, floorY)) return _createDirectParts(room, _findSortedNonFloorExits(room, floorY), flights);

  const windingMidStoryLandingParts = _createWindingMidStoryLandingParts(room, flights);
  const backRowFlightParts = flights.filter((_, flightIndex) => flightIndex % 2 === 0).map(flight => _createFlightPart(flight, BACK_ROW_Z));
  const { rightCatwalkParts, trailingStoryParts } = _createWindingStoryLandingParts(room, flights);
  const frontRowFlightParts = flights.filter((_, flightIndex) => flightIndex % 2 === 1).map(flight => _createFlightPart(flight, FRONT_ROW_Z));
  return [
    ...windingMidStoryLandingParts,
    ...backRowFlightParts,
    ...rightCatwalkParts,
    ...frontRowFlightParts,
    ...trailingStoryParts
  ];
}