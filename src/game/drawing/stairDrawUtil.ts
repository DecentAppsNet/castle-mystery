/* This module groups staircase line drawing helpers for room rendering. */

import { assert } from "decent-portal";

import { COLOR_BLACK } from "./drawConstants";
import { gameToCanvasPosition } from "./drawUtil";
import { FLOOR_WAYPOINT_Y_OFFSET, roomWidthToColumnCount } from "../roomUtil";
import { doesStairFlightEndAtPosition, findStairFlightIntersectionAtY, STAIR_POSITION_TOLERANCE } from "../stairUtil";
import { calcPanelOffset } from "./roomPanelDrawUtil";
import { drawProjectedCuboid } from "./cuboidDrawUtil";
import Position from "../types/Position";
import RoomExit from "../types/RoomExit";
import Room from "../types/Room";
import ScalingFactors from "../types/ScalingFactors";
import StairFlight from "../types/StairFlight";

const PREFERRED_STEP_RISE_RUN = 1;
const STAIRS_LINE_WIDTH_MULTIPLIER = 0.2;
const STAIR_ANGLE_TOLERANCE = FLOOR_WAYPOINT_Y_OFFSET + STAIR_POSITION_TOLERANCE;
const FRONT_ROW_Z = 0.6667;
const STAIR_CUBOID_DEPTH = 0.3333;
const LANDING_CUBOID_DEPTH = 0.6667;
const MIDDLE_ROW_Z = 1 - LANDING_CUBOID_DEPTH;
const WINDING_MID_STORY_LANDING_DEPTH = 1;
const WINDING_STORY_LANDING_DEPTH = 1;
const STAIR_CUBOID_FILL = "rgb(154, 154, 154)";

function _calcStairStepCount(totalDistance:number):number {
  return Math.max(1, Math.round(totalDistance / PREFERRED_STEP_RISE_RUN));
}

function _calcStairStepHeight(fromPosition:Position, toPosition:Position):number {
  const totalRise = Math.abs(toPosition.y - fromPosition.y);
  const stepCount = _calcStairStepCount(Math.max(totalRise, Math.abs(toPosition.x - fromPosition.x)));
  return totalRise / stepCount;
}

function _applyStairStrokeStyle(scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  context.strokeStyle = COLOR_BLACK;
  context.lineWidth = Math.max(1, scalingFactors.roomLineWidth * STAIRS_LINE_WIDTH_MULTIPLIER);
}

function _projectRoomPointWithDepth(x:number, y:number, z:number, scalingFactors:ScalingFactors):[number, number] {
  const [canvasX, canvasY] = gameToCanvasPosition(x, y, scalingFactors);
  const [offsetX, offsetY] = calcPanelOffset(scalingFactors);
  return [canvasX + offsetX * z, canvasY + offsetY * z];
}

function _drawStairStepCuboid(leftX:number, topY:number, width:number, height:number, z:number,
  scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const rightX = leftX + width;
  const bottomY = topY + height;
  const backTopLeft = _projectRoomPointWithDepth(leftX, topY, z, scalingFactors);
  const backTopRight = _projectRoomPointWithDepth(rightX, topY, z, scalingFactors);
  const backBottomLeft = _projectRoomPointWithDepth(leftX, bottomY, z, scalingFactors);
  const frontTopLeft = _projectRoomPointWithDepth(leftX, topY, z + STAIR_CUBOID_DEPTH, scalingFactors);
  const frontTopRight = _projectRoomPointWithDepth(rightX, topY, z + STAIR_CUBOID_DEPTH, scalingFactors);
  const frontBottomLeft = _projectRoomPointWithDepth(leftX, bottomY, z + STAIR_CUBOID_DEPTH, scalingFactors);
  const frontBottomRight = _projectRoomPointWithDepth(rightX, bottomY, z + STAIR_CUBOID_DEPTH, scalingFactors);
  drawProjectedCuboid({
    backTopLeft,
    backTopRight,
    backBottomLeft,
    frontTopLeft,
    frontTopRight,
    frontBottomLeft,
    frontBottomRight
  }, {
    fillStyle:STAIR_CUBOID_FILL,
    lineWidth:Math.max(1, scalingFactors.roomLineWidth * STAIRS_LINE_WIDTH_MULTIPLIER),
    strokeStyle:COLOR_BLACK
  }, context);
}

function _drawLandingCuboid(leftX:number, topY:number, width:number, height:number, z:number, depth:number,
  scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const rightX = leftX + width;
  const bottomY = topY + height;
  const backTopLeft = _projectRoomPointWithDepth(leftX, topY, z, scalingFactors);
  const backTopRight = _projectRoomPointWithDepth(rightX, topY, z, scalingFactors);
  const backBottomLeft = _projectRoomPointWithDepth(leftX, bottomY, z, scalingFactors);
  const frontTopLeft = _projectRoomPointWithDepth(leftX, topY, z + depth, scalingFactors);
  const frontTopRight = _projectRoomPointWithDepth(rightX, topY, z + depth, scalingFactors);
  const frontBottomLeft = _projectRoomPointWithDepth(leftX, bottomY, z + depth, scalingFactors);
  const frontBottomRight = _projectRoomPointWithDepth(rightX, bottomY, z + depth, scalingFactors);
  drawProjectedCuboid({
    backTopLeft,
    backTopRight,
    backBottomLeft,
    frontTopLeft,
    frontTopRight,
    frontBottomLeft,
    frontBottomRight
  }, {
    fillStyle:STAIR_CUBOID_FILL,
    lineWidth:Math.max(1, scalingFactors.roomLineWidth * STAIRS_LINE_WIDTH_MULTIPLIER),
    strokeStyle:COLOR_BLACK
  }, context);
}

function _drawHorizontalLine(fromPosition:Position, toPosition:Position, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  _applyStairStrokeStyle(scalingFactors, context);
  context.beginPath();
  context.moveTo(...gameToCanvasPosition(fromPosition.x, fromPosition.y, scalingFactors));
  context.lineTo(...gameToCanvasPosition(toPosition.x, toPosition.y, scalingFactors));
  context.stroke();
}

export function drawStairs(fromPosition:Position, toPosition:Position, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  drawStairsAtRow(fromPosition, toPosition, 0, scalingFactors, context);
}

function _snapFlightTo45DegreesForDrawing(fromPosition:Position, toPosition:Position):{ fromPosition:Position, toPosition:Position } {
  const totalRise = toPosition.y - fromPosition.y;
  const totalRun = toPosition.x - fromPosition.x;
  const riseMagnitude = Math.abs(totalRise);
  const runMagnitude = Math.abs(totalRun);
  if (Math.abs(riseMagnitude - runMagnitude) > STAIR_ANGLE_TOLERANCE) return { fromPosition, toPosition };
  return {
    fromPosition,
    toPosition:{
      x:toPosition.x,
      y:fromPosition.y + Math.sign(totalRise) * runMagnitude
    }
  };
}

function drawStairsAtRow(fromPosition:Position, toPosition:Position, z:number, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const snappedFlight = _snapFlightTo45DegreesForDrawing(fromPosition, toPosition);
  const totalRise = snappedFlight.toPosition.y - snappedFlight.fromPosition.y;
  const totalRun = snappedFlight.toPosition.x - snappedFlight.fromPosition.x;
  assert(Math.abs(Math.abs(totalRise) - Math.abs(totalRun)) <= STAIR_POSITION_TOLERANCE, 'stairs must be drawn at a 45 degree angle');

  const stepCount = _calcStairStepCount(Math.max(Math.abs(totalRise), Math.abs(totalRun)));
  const stepRise = totalRise / stepCount;
  const stepRun = totalRun / stepCount;
  let currentX = snappedFlight.fromPosition.x;
  let currentY = snappedFlight.fromPosition.y;
  for (let i = 0; i < stepCount; i++) {
    const nextX = currentX + stepRun;
    const nextY = currentY + stepRise;
    _drawStairStepCuboid(Math.min(currentX, nextX), Math.min(currentY, nextY), Math.abs(stepRun), Math.abs(stepRise), z,
      scalingFactors, context);
    currentX = nextX;
    currentY = nextY;
  }
}

function _calcRoomFloorY(room:Room):number {
  return room.rect.y + room.rect.height - FLOOR_WAYPOINT_Y_OFFSET;
}

function _findSortedNonFloorExits(room:Room, floorY:number):RoomExit[] {
  return [...room.exits]
    .filter(exit => exit.y < floorY)
    .sort((left, right) => left.y - right.y || left.x - right.x);
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

function _drawLandings(room:Room, exits:RoomExit[], flights:StairFlight[], scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const columnWidth = room.rect.width / roomWidthToColumnCount(room.rect.width);
  exits
    .forEach(exit => {
      if (doesStairFlightEndAtPosition(flights, exit)) return;
      const stairIntersection = _findNearestStairIntersectionAtExit(flights, exit);
      if (stairIntersection === null) return;
      const stairIntersectionX = stairIntersection.x;
      const landingWidth = Math.abs(exit.x - stairIntersectionX);
      if (Math.abs(landingWidth - columnWidth) <= STAIR_POSITION_TOLERANCE) {
        const stepHeight = _calcStairStepHeight(stairIntersection.flight.startPosition, stairIntersection.flight.endPosition);
        _drawLandingCuboid(Math.min(exit.x, stairIntersectionX), exit.y, landingWidth, stepHeight, 0, LANDING_CUBOID_DEPTH,
          scalingFactors, context);
        return;
      }
      _drawHorizontalLine({ x:stairIntersectionX, y:exit.y }, { x:exit.x, y:exit.y }, scalingFactors, context);
    });
}

function _drawWindingMidStoryLandings(room:Room, flights:StairFlight[], scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const columnWidth = room.rect.width / roomWidthToColumnCount(room.rect.width);

  for (let flightIndex = 0; flightIndex + 1 < flights.length; flightIndex += 2) {
    const firstFlight = _snapFlightTo45DegreesForDrawing(flights[flightIndex].startPosition, flights[flightIndex].endPosition);
    const landingLeftX = Math.max(firstFlight.fromPosition.x, firstFlight.toPosition.x);
    const landingTopY = Math.min(firstFlight.fromPosition.y, firstFlight.toPosition.y);
    const landingHeight = _calcStairStepHeight(firstFlight.fromPosition, firstFlight.toPosition);
    _drawLandingCuboid(landingLeftX, landingTopY, columnWidth, landingHeight, 0, WINDING_MID_STORY_LANDING_DEPTH,
      scalingFactors, context);
  }
}

function _hasExitAtStoryY(room:Room, storyY:number, wallX:number):boolean {
  return room.exits.some(exit =>
    Math.abs(exit.x - wallX) <= STAIR_POSITION_TOLERANCE
    && Math.abs(exit.y - storyY) <= STAIR_ANGLE_TOLERANCE);
}

function _drawWindingStoryLandings(room:Room, flights:StairFlight[], scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const columnWidth = room.rect.width / roomWidthToColumnCount(room.rect.width);
  const roomRightX = room.rect.x + room.rect.width;

  for (let flightIndex = 1; flightIndex < flights.length; flightIndex += 2) {
    const secondFlight = _snapFlightTo45DegreesForDrawing(flights[flightIndex].startPosition, flights[flightIndex].endPosition);
    const landingLeftX = Math.min(secondFlight.fromPosition.x, secondFlight.toPosition.x) - columnWidth;
    const landingTopY = Math.min(secondFlight.fromPosition.y, secondFlight.toPosition.y);
    const landingHeight = _calcStairStepHeight(secondFlight.fromPosition, secondFlight.toPosition);
    const areStairsContinuing = flightIndex + 1 < flights.length;
    const isRightExitPresent = _hasExitAtStoryY(room, flights[flightIndex].endPosition.y, roomRightX);

    if (isRightExitPresent) {
      _drawLandingCuboid(
        landingLeftX,
        landingTopY,
        columnWidth * 4,
        landingHeight,
        MIDDLE_ROW_Z,
        STAIR_CUBOID_DEPTH,
        scalingFactors,
        context
      );
    }

    _drawLandingCuboid(
      landingLeftX,
      landingTopY,
      columnWidth,
      landingHeight,
      areStairsContinuing ? 0 : MIDDLE_ROW_Z,
      areStairsContinuing ? WINDING_STORY_LANDING_DEPTH : LANDING_CUBOID_DEPTH,
      scalingFactors,
      context
    );
  }
}

export function drawRoomStairs(room:Room, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  if (!room.stairs.length) return;

  const floorY = _calcRoomFloorY(room);
  const areDirectFlights = _areDirectFlights(room.stairs, floorY);
  if (areDirectFlights) {
    room.stairs.forEach(flight => drawStairsAtRow(
      flight.startPosition,
      flight.endPosition,
      0,
      scalingFactors,
      context
    ));
    _drawLandings(room, _findSortedNonFloorExits(room, floorY), room.stairs, scalingFactors, context);
    return;
  }
  _drawWindingMidStoryLandings(room, room.stairs, scalingFactors, context);
  room.stairs
    .filter((_, flightIndex) => flightIndex % 2 === 0)
    .forEach(flight => drawStairsAtRow(
      flight.startPosition,
      flight.endPosition,
      0,
      scalingFactors,
      context
    ));
  room.stairs
    .filter((_, flightIndex) => flightIndex % 2 === 1)
    .forEach(flight => drawStairsAtRow(
      flight.startPosition,
      flight.endPosition,
      FRONT_ROW_Z,
      scalingFactors,
      context
    ));
  _drawWindingStoryLandings(room, room.stairs, scalingFactors, context);
}