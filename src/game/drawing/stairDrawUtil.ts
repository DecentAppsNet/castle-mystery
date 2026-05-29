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
const STAIR_ANGLE_TOLERANCE = STAIR_POSITION_TOLERANCE;
const STAIR_CUBOID_DEPTH = 0.3333;
const LANDING_CUBOID_DEPTH = 0.6667;
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

function _drawStairStepCuboid(leftX:number, topY:number, width:number, height:number,
  scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const rightX = leftX + width;
  const bottomY = topY + height;
  const backTopLeft = _projectRoomPointWithDepth(leftX, topY, 0, scalingFactors);
  const backTopRight = _projectRoomPointWithDepth(rightX, topY, 0, scalingFactors);
  const backBottomLeft = _projectRoomPointWithDepth(leftX, bottomY, 0, scalingFactors);
  const frontTopLeft = _projectRoomPointWithDepth(leftX, topY, STAIR_CUBOID_DEPTH, scalingFactors);
  const frontTopRight = _projectRoomPointWithDepth(rightX, topY, STAIR_CUBOID_DEPTH, scalingFactors);
  const frontBottomLeft = _projectRoomPointWithDepth(leftX, bottomY, STAIR_CUBOID_DEPTH, scalingFactors);
  const frontBottomRight = _projectRoomPointWithDepth(rightX, bottomY, STAIR_CUBOID_DEPTH, scalingFactors);
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

function _drawLandingCuboid(leftX:number, topY:number, width:number, height:number,
  scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const rightX = leftX + width;
  const bottomY = topY + height;
  const backTopLeft = _projectRoomPointWithDepth(leftX, topY, 0, scalingFactors);
  const backTopRight = _projectRoomPointWithDepth(rightX, topY, 0, scalingFactors);
  const backBottomLeft = _projectRoomPointWithDepth(leftX, bottomY, 0, scalingFactors);
  const frontTopLeft = _projectRoomPointWithDepth(leftX, topY, LANDING_CUBOID_DEPTH, scalingFactors);
  const frontTopRight = _projectRoomPointWithDepth(rightX, topY, LANDING_CUBOID_DEPTH, scalingFactors);
  const frontBottomLeft = _projectRoomPointWithDepth(leftX, bottomY, LANDING_CUBOID_DEPTH, scalingFactors);
  const frontBottomRight = _projectRoomPointWithDepth(rightX, bottomY, LANDING_CUBOID_DEPTH, scalingFactors);
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
  const totalRise = toPosition.y - fromPosition.y;
  const totalRun = toPosition.x - fromPosition.x;
  assert(Math.abs(Math.abs(totalRise) - Math.abs(totalRun)) <= STAIR_ANGLE_TOLERANCE, 'stairs must be drawn at a 45 degree angle');

  const stepCount = _calcStairStepCount(Math.max(Math.abs(totalRise), Math.abs(totalRun)));
  const stepRise = totalRise / stepCount;
  const stepRun = totalRun / stepCount;
  let currentX = fromPosition.x;
  let currentY = fromPosition.y;
  for (let i = 0; i < stepCount; i++) {
    const nextX = currentX + stepRun;
    const nextY = currentY + stepRise;
    _drawStairStepCuboid(Math.min(currentX, nextX), Math.min(currentY, nextY), Math.abs(stepRun), Math.abs(stepRise),
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
        _drawLandingCuboid(Math.min(exit.x, stairIntersectionX), exit.y, landingWidth, stepHeight, scalingFactors, context);
        return;
      }
      _drawHorizontalLine({ x:stairIntersectionX, y:exit.y }, { x:exit.x, y:exit.y }, scalingFactors, context);
    });
}

export function drawRoomStairs(room:Room, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  if (!room.stairs.length) return;

  room.stairs.forEach(flight => drawStairs(flight.startPosition, flight.endPosition, scalingFactors, context));
  _drawLandings(room, _findSortedNonFloorExits(room, _calcRoomFloorY(room)), room.stairs, scalingFactors, context);
}