/* This module groups staircase line drawing helpers for room rendering. */

import { assert, assertNonNullable } from "decent-portal";

import { COLOR_BLACK } from "./drawConstants";
import { gameToCanvasPosition } from "./drawUtil";
import Position from "../types/Position";
import RoomExit from "../types/RoomExit";
import ScalingFactors from "../types/ScalingFactors";

const PREFERRED_STEP_RISE_RUN = 1;
const STAIRS_LINE_WIDTH_MULTIPLIER = 0.2;
const STAIR_ANGLE_TOLERANCE = 0.000001;

type StairFlight = {
  startPosition:Position,
  endPosition:Position
};

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

function _findHighestNonFloorExitY(exits:RoomExit[], floorY:number):number|null {
  const nonFloorExitYs = exits
    .filter(exit => exit.y < floorY)
    .map(exit => exit.y);
  if (!nonFloorExitYs.length) return null;
  return Math.min(...nonFloorExitYs);
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

function _findStairIntersectionXAtY(flights:StairFlight[], targetY:number):number|null {
  for (const flight of flights) {
    const minY = Math.min(flight.startPosition.y, flight.endPosition.y);
    const maxY = Math.max(flight.startPosition.y, flight.endPosition.y);
    if (targetY < minY - STAIR_ANGLE_TOLERANCE || targetY > maxY + STAIR_ANGLE_TOLERANCE) continue;

    const totalRise = flight.endPosition.y - flight.startPosition.y;
    const totalRun = flight.endPosition.x - flight.startPosition.x;
    if (Math.abs(totalRise) <= STAIR_ANGLE_TOLERANCE) continue;
    const yRatio = (targetY - flight.startPosition.y) / totalRise;
    return flight.startPosition.x + totalRun * yRatio;
  }
  return null;
}

function _drawExitConnectors(exits:RoomExit[], floorY:number, flights:StairFlight[], scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  exits
    .filter(exit => exit.y < floorY)
    .forEach(exit => {
      const stairIntersectionX = _findStairIntersectionXAtY(flights, exit.y);
      if (stairIntersectionX === null) return;
      _drawHorizontalLine({ x:stairIntersectionX, y:exit.y }, { x:exit.x, y:exit.y }, scalingFactors, context);
    });
}

export function drawWindingStairs(floorLeftPosition:Position, floorRightPosition:Position, exits:RoomExit[], scalingFactors:ScalingFactors,
  context:CanvasRenderingContext2D) {
  const floorY = Math.max(floorLeftPosition.y, floorRightPosition.y);
  const stairsTopY = _findHighestNonFloorExitY(exits, floorY);
  if (stairsTopY === null) return;

  const flightLeftX = floorLeftPosition.x;
  const flightRightX = floorRightPosition.x;
  let flightStartPosition = { ...floorLeftPosition };
  let slope:1|-1 = 1;
  const flights:StairFlight[] = [];

  while (flightStartPosition.y > stairsTopY) {
    const boundaryX = slope === 1 ? flightRightX : flightLeftX;
    const boundaryIntersection = _calcVerticalIntersection(flightStartPosition, boundaryX, slope);
    const topIntersection = _calcTopIntersection(flightStartPosition, stairsTopY, slope);
    const flightEndPosition = _findCloserFlightEndToFloor(flightStartPosition, boundaryIntersection, topIntersection);
    assertNonNullable(flightEndPosition, 'winding stairs must find a valid flight end position');
    drawStairs(flightStartPosition, flightEndPosition, scalingFactors, context);
    flights.push({ startPosition:flightStartPosition, endPosition:flightEndPosition });
    flightStartPosition = flightEndPosition;
    slope = slope === 1 ? -1 : 1;
  }

  _drawExitConnectors(exits, floorY, flights, scalingFactors, context);
}