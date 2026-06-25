/* This module groups roof-surface drawing helpers for room tops and roof-facing panels.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { COLOR_DARK_GRAY } from "./drawColorConstants";
import { gameToCanvasPosition } from "./drawUtil";
import { calcPanelOffset } from "./roomPanelProjectionUtil";
import { calcRoofPeakHeight, findRoofTiles, ROOF_APEX_Z } from "../roomRoofUtil";
import Room from "../types/Room";
import ScalingFactors from "../types/ScalingFactors";

const COLOR_ROOF_LEFT_FILL = "#9f8569";
const COLOR_ROOF_FRONT_FILL = "#b59a7a";
const ROOF_INNER_LINE_WIDTH_RATIO = 0.5;

function _projectRoomPointWithDepth(x:number, y:number, z:number, scalingFactors:ScalingFactors):[number, number] {
  const [canvasX, canvasY] = gameToCanvasPosition(x, y, scalingFactors);
  const [offsetX, offsetY] = calcPanelOffset(scalingFactors);
  return [canvasX + offsetX * z, canvasY + offsetY * z];
}

function _drawRoofFace(points:Array<[number, number]>, fillStyle:string, context:CanvasRenderingContext2D) {
  context.fillStyle = fillStyle;
  context.beginPath();
  context.moveTo(...points[0]);
  for (let pointIndex = 1; pointIndex < points.length; ++pointIndex) {
    context.lineTo(...points[pointIndex]);
  }
  context.closePath();
  context.fill();
}

function _strokeRoofEdge(fromPoint:[number, number], toPoint:[number, number], lineWidth:number, context:CanvasRenderingContext2D) {
  context.strokeStyle = COLOR_DARK_GRAY;
  context.lineWidth = lineWidth;
  context.beginPath();
  context.moveTo(...fromPoint);
  context.lineTo(...toPoint);
  context.stroke();
}

function _drawRoofTile(leftX:number, topY:number, width:number, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const rightX = leftX + width;
  const midX = leftX + width / 2;
  const peakY = topY - calcRoofPeakHeight(width);
  const apex = _projectRoomPointWithDepth(midX, peakY, ROOF_APEX_Z, scalingFactors);
  const backLeft = _projectRoomPointWithDepth(leftX, topY, 0, scalingFactors);
  const frontLeft = _projectRoomPointWithDepth(leftX, topY, 1, scalingFactors);
  const frontRight = _projectRoomPointWithDepth(rightX, topY, 1, scalingFactors);

  _drawRoofFace([backLeft, apex, frontLeft], COLOR_ROOF_LEFT_FILL, context);
  _drawRoofFace([frontLeft, apex, frontRight], COLOR_ROOF_FRONT_FILL, context);

  _strokeRoofEdge(backLeft, apex, scalingFactors.roomLineWidth, context);
  _strokeRoofEdge(backLeft, frontLeft, scalingFactors.roomLineWidth, context);
  _strokeRoofEdge(frontLeft, apex, scalingFactors.roomLineWidth * ROOF_INNER_LINE_WIDTH_RATIO, context);
  _strokeRoofEdge(apex, frontRight, scalingFactors.roomLineWidth, context);
  _strokeRoofEdge(frontLeft, frontRight, scalingFactors.roomLineWidth, context);
}

export function drawRoomRoofs(room:Room, rooms:ReadonlyArray<Room>, groundFloorY:number,
  scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  findRoofTiles(room, rooms, groundFloorY).forEach(tile => _drawRoofTile(tile.leftX, tile.topY, tile.width, scalingFactors, context));
}