import Room from "../types/Room";
import ScalingFactors from "../types/ScalingFactors";
import { gameToCanvasPosition } from "./drawUtil";

const PANEL_OFFSET_X_SCALE = 8;
const PANEL_OFFSET_Y_SCALE = 4;

export { PANEL_OFFSET_X_SCALE, PANEL_OFFSET_Y_SCALE };

function _fillPanel(points:Array<[number, number]>, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  context.lineWidth = scalingFactors.roomLineWidth;
  context.beginPath();
  context.moveTo(...points[0]);
  for (let pointIndex = 1; pointIndex < points.length; ++pointIndex) {
    context.lineTo(...points[pointIndex]);
  }
  context.closePath();
  context.fill();
}

function _strokePanelSegment(fromPoint:[number, number], toPoint:[number, number], scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  context.lineWidth = scalingFactors.roomLineWidth;
  context.beginPath();
  context.moveTo(...fromPoint);
  context.lineTo(...toPoint);
  context.stroke();
}

export function calcPanelOffset(scalingFactors:ScalingFactors):[number, number] {
  return [
    scalingFactors.roomLineWidth * PANEL_OFFSET_X_SCALE,
    scalingFactors.roomLineWidth * PANEL_OFFSET_Y_SCALE
  ];
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

export function drawRightWallPanel(room:Room, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const [offsetX, offsetY] = calcPanelOffset(scalingFactors);
  const topRight = gameToCanvasPosition(room.rect.x + room.rect.width, room.rect.y, scalingFactors);
  const bottomRight = gameToCanvasPosition(room.rect.x + room.rect.width, room.rect.y + room.rect.height, scalingFactors);
  const outerBottomRight:[number, number] = [bottomRight[0] + offsetX, bottomRight[1] + offsetY];
  const outerTopRight:[number, number] = [topRight[0] + offsetX, topRight[1] + offsetY];
  _fillPanel([
    topRight,
    bottomRight,
    outerBottomRight,
    outerTopRight
  ], scalingFactors, context);
  _strokePanelSegment(topRight, outerTopRight, scalingFactors, context);
  _strokePanelSegment(outerTopRight, outerBottomRight, scalingFactors, context);
}