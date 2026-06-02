/* This module groups room-panel drawing helpers for wall panels, floors, and room-side surfaces.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import Room from "../types/Room";
import RoomExit from "../types/RoomExit";
import ScalingFactors from "../types/ScalingFactors";
import { gameToCanvasPosition } from "./drawUtil";
import { calcPanelOffset, createProjectedRightWallDoorOutlinePoints, getRightWallDoorHeightPixels } from "./roomPanelProjectionUtil";
import { findRightWallPanelSpans } from "../rightWallPanelUtil";

function _fillPanel(points:Array<[number, number]>, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  context.lineWidth = scalingFactors.roomLineWidth;
  _traceClosedPolygon(points, context);
  context.fill();
}

function _traceClosedPolygon(points:Array<[number, number]>, context:CanvasRenderingContext2D) {
  context.beginPath();
  context.moveTo(...points[0]);
  for (let pointIndex = 1; pointIndex < points.length; ++pointIndex) {
    context.lineTo(...points[pointIndex]);
  }
  context.closePath();
}

function _fillPanelWithCutouts(points:Array<[number, number]>, cutoutPoints:Array<Array<[number, number]>>,
  scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  context.lineWidth = scalingFactors.roomLineWidth;
  context.beginPath();
  context.moveTo(...points[0]);
  for (let pointIndex = 1; pointIndex < points.length; ++pointIndex) {
    context.lineTo(...points[pointIndex]);
  }
  context.closePath();
  cutoutPoints.forEach(cutout => {
    context.moveTo(...cutout[0]);
    for (let pointIndex = 1; pointIndex < cutout.length; ++pointIndex) {
      context.lineTo(...cutout[pointIndex]);
    }
    context.closePath();
  });
  context.fill("evenodd");
}

function _strokePanelSegment(fromPoint:[number, number], toPoint:[number, number], scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  context.lineWidth = scalingFactors.roomLineWidth;
  context.beginPath();
  context.moveTo(...fromPoint);
  context.lineTo(...toPoint);
  context.stroke();
}

function _drawRightWallPanelSpan(room:Room, topY:number, height:number, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const [offsetX, offsetY] = calcPanelOffset(scalingFactors);
  const rightWallX = room.rect.x + room.rect.width;
  const doorHeight = getRightWallDoorHeightPixels(scalingFactors) / scalingFactors.scaleY;
  const topRight = gameToCanvasPosition(room.rect.x + room.rect.width, topY, scalingFactors);
  const bottomRight = gameToCanvasPosition(room.rect.x + room.rect.width, topY + height, scalingFactors);
  const outerBottomRight:[number, number] = [bottomRight[0] + offsetX, bottomRight[1] + offsetY];
  const outerTopRight:[number, number] = [topRight[0] + offsetX, topRight[1] + offsetY];
  const panelPoints:Array<[number, number]> = [
    topRight,
    bottomRight,
    outerBottomRight,
    outerTopRight
  ];
  const cutoutPoints = _findRightWallPanelSpanExits(room, topY, height)
    .map(exit => createProjectedRightWallDoorOutlinePoints(rightWallX, exit.y, doorHeight, scalingFactors));

  if (cutoutPoints.length === 0) {
    _fillPanel(panelPoints, scalingFactors, context);
  } else {
    _fillPanelWithCutouts(panelPoints, cutoutPoints, scalingFactors, context);
  }

  _strokePanelSegment(topRight, bottomRight, scalingFactors, context);
  _strokePanelSegment(topRight, outerTopRight, scalingFactors, context);
  _strokePanelSegment(outerTopRight, outerBottomRight, scalingFactors, context);
}

function _isRightWallExit(room:Room, exit:RoomExit):boolean {
  return exit.x === room.rect.x + room.rect.width;
}

function _findRightWallPanelSpanExits(room:Room, topY:number, height:number):RoomExit[] {
  const bottomY = topY + height;
  return room.exits
    .filter(exit => _isRightWallExit(room, exit) && exit.y > topY && exit.y <= bottomY)
    .sort((exit1, exit2) => exit1.y - exit2.y);
}

export function drawFloorPanel(room:Room, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const [offsetX, offsetY] = calcPanelOffset(scalingFactors);
  const bottomLeft = gameToCanvasPosition(room.rect.x, room.rect.y + room.rect.height, scalingFactors);
  const bottomRight = gameToCanvasPosition(room.rect.x + room.rect.width, room.rect.y + room.rect.height, scalingFactors);
  const outerBottomRight:[number, number] = [bottomRight[0] + offsetX, bottomRight[1] + offsetY];
  const outerBottomLeft:[number, number] = [bottomLeft[0] + offsetX, bottomLeft[1] + offsetY];
  _fillPanel([
    bottomLeft,
    bottomRight,
    outerBottomRight,
    outerBottomLeft
  ], scalingFactors, context);
  _strokePanelSegment(bottomRight, outerBottomRight, scalingFactors, context);
  _strokePanelSegment(outerBottomRight, outerBottomLeft, scalingFactors, context);
  _strokePanelSegment(outerBottomLeft, bottomLeft, scalingFactors, context);
}

export function drawRightWallPanel(room:Room, rooms:ReadonlyArray<Room>, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  findRightWallPanelSpans(room, rooms).forEach(span => _drawRightWallPanelSpan(room, span.topY, span.height, scalingFactors, context));
}