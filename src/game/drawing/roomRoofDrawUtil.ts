import { COLOR_DARK_GRAY } from "./drawConstants";
import { gameToCanvasPosition } from "./drawUtil";
import { calcPanelOffset } from "./roomPanelDrawUtil";
import { calcRoofPeakHeight, findRoofTiles, ROOF_APEX_Z } from "../roomRoofUtil";
import Room from "../types/Room";
import ScalingFactors from "../types/ScalingFactors";

const COLOR_ROOF_LEFT_FILL = "#9f8569";
const COLOR_ROOF_FRONT_FILL = "#b59a7a";

function _projectRoomPointWithDepth(x:number, y:number, z:number, scalingFactors:ScalingFactors):[number, number] {
  const [canvasX, canvasY] = gameToCanvasPosition(x, y, scalingFactors);
  const [offsetX, offsetY] = calcPanelOffset(scalingFactors);
  return [canvasX + offsetX * z, canvasY + offsetY * z];
}

function _drawRoofFace(points:Array<[number, number]>, fillStyle:string, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  context.fillStyle = fillStyle;
  context.strokeStyle = COLOR_DARK_GRAY;
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

function _drawRoofTile(leftX:number, topY:number, width:number, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const rightX = leftX + width;
  const midX = leftX + width / 2;
  const peakY = topY - calcRoofPeakHeight(width);
  const apex = _projectRoomPointWithDepth(midX, peakY, ROOF_APEX_Z, scalingFactors);
  const backLeft = _projectRoomPointWithDepth(leftX, topY, 0, scalingFactors);
  const frontLeft = _projectRoomPointWithDepth(leftX, topY, 1, scalingFactors);
  const frontRight = _projectRoomPointWithDepth(rightX, topY, 1, scalingFactors);

  _drawRoofFace([backLeft, apex, frontLeft], COLOR_ROOF_LEFT_FILL, scalingFactors, context);
  _drawRoofFace([frontLeft, apex, frontRight], COLOR_ROOF_FRONT_FILL, scalingFactors, context);
}

export function drawRoomRoofs(room:Room, rooms:ReadonlyArray<Room>, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  findRoofTiles(room, rooms).forEach(tile => _drawRoofTile(tile.leftX, tile.topY, tile.width, scalingFactors, context));
}