/* This module groups staircase line drawing helpers for room rendering. */

import { assert } from "decent-portal";

import { COLOR_BLACK } from "./drawConstants";
import { gameToCanvasPosition } from "./drawUtil";
import { FLOOR_WAYPOINT_Y_OFFSET } from "../roomUtil";
import { doesStairFlightEndAtPosition, findStairFlightIntersectionAtY, STAIR_POSITION_TOLERANCE } from "../stairUtil";
import Position from "../types/Position";
import RoomExit from "../types/RoomExit";
import Room from "../types/Room";
import ScalingFactors from "../types/ScalingFactors";
import StairFlight from "../types/StairFlight";

const PREFERRED_STEP_RISE_RUN = 1;
const STAIRS_LINE_WIDTH_MULTIPLIER = 0.2;
const STAIR_ANGLE_TOLERANCE = STAIR_POSITION_TOLERANCE;

function _calcStairStepCount(totalDistance:number):number {
  return Math.max(1, Math.round(totalDistance / PREFERRED_STEP_RISE_RUN));
}

function _applyStairStrokeStyle(scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  context.strokeStyle = COLOR_BLACK;
  context.lineWidth = Math.max(1, scalingFactors.roomLineWidth * STAIRS_LINE_WIDTH_MULTIPLIER);
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
  _applyStairStrokeStyle(scalingFactors, context);
  context.beginPath();
  context.moveTo(...gameToCanvasPosition(fromPosition.x, fromPosition.y, scalingFactors));

  let currentX = fromPosition.x;
  let currentY = fromPosition.y;
  for (let i = 0; i < stepCount; i++) {
    currentX += stepRun;
    context.lineTo(...gameToCanvasPosition(currentX, currentY, scalingFactors));
    currentY += stepRise;
    context.lineTo(...gameToCanvasPosition(currentX, currentY, scalingFactors));
  }
  context.stroke();
}

function _calcRoomFloorY(room:Room):number {
  return room.rect.y + room.rect.height - FLOOR_WAYPOINT_Y_OFFSET;
}

function _findSortedNonFloorExits(room:Room, floorY:number):RoomExit[] {
  return [...room.exits]
    .filter(exit => exit.y < floorY)
    .sort((left, right) => left.y - right.y || left.x - right.x);
}

function _findStairIntersectionXAtY(flights:StairFlight[], targetY:number):number|null {
  return findStairFlightIntersectionAtY(flights, targetY)?.x ?? null;
}

function _drawLandings(exits:RoomExit[], flights:StairFlight[], scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  exits
    .forEach(exit => {
      if (doesStairFlightEndAtPosition(flights, exit)) return;
      const stairIntersectionX = _findStairIntersectionXAtY(flights, exit.y);
      if (stairIntersectionX === null) return;
      _drawHorizontalLine({ x:stairIntersectionX, y:exit.y }, { x:exit.x, y:exit.y }, scalingFactors, context);
    });
}

export function drawRoomStairs(room:Room, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  if (!room.stairs.length) return;

  room.stairs.forEach(flight => drawStairs(flight.startPosition, flight.endPosition, scalingFactors, context));
  _drawLandings(_findSortedNonFloorExits(room, _calcRoomFloorY(room)), room.stairs, scalingFactors, context);
}