import Room from "../types/Room";
import ScalingFactors from "../types/ScalingFactors";
import { gameToCanvasPosition } from "./drawUtil";

const PANEL_OFFSET_X_SCALE = 8;
const PANEL_OFFSET_Y_SCALE = 4;

function _drawPanel(points:Array<[number, number]>, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  context.lineWidth = scalingFactors.roomLineWidth;
  context.beginPath();
  context.moveTo(...points[0]);
  for (let pointIndex = 1; pointIndex < points.length; ++pointIndex) {
    context.lineTo(...points[pointIndex]);
  }
  context.closePath();
  context.fill();
  context.stroke();
}

function _calcPanelOffset(scalingFactors:ScalingFactors):[number, number] {
  return [
    scalingFactors.roomLineWidth * PANEL_OFFSET_X_SCALE,
    scalingFactors.roomLineWidth * PANEL_OFFSET_Y_SCALE
  ];
}

export function drawFloorPanel(room:Room, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const [offsetX, offsetY] = _calcPanelOffset(scalingFactors);
  const bottomLeft = gameToCanvasPosition(room.rect.x, room.rect.y + room.rect.height, scalingFactors);
  const bottomRight = gameToCanvasPosition(room.rect.x + room.rect.width, room.rect.y + room.rect.height, scalingFactors);
  _drawPanel([
    bottomLeft,
    bottomRight,
    [bottomRight[0] + offsetX, bottomRight[1] + offsetY],
    [bottomLeft[0] + offsetX, bottomLeft[1] + offsetY]
  ], scalingFactors, context);
}

export function drawRightWallPanel(room:Room, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const [offsetX, offsetY] = _calcPanelOffset(scalingFactors);
  const topRight = gameToCanvasPosition(room.rect.x + room.rect.width, room.rect.y, scalingFactors);
  const bottomRight = gameToCanvasPosition(room.rect.x + room.rect.width, room.rect.y + room.rect.height, scalingFactors);
  _drawPanel([
    topRight,
    bottomRight,
    [bottomRight[0] + offsetX, bottomRight[1] + offsetY],
    [topRight[0] + offsetX, topRight[1] + offsetY]
  ], scalingFactors, context);
}