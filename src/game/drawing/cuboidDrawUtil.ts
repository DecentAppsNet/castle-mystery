import Cuboid from "../types/Cuboid";
import Room from "../types/Room";
import ScalingFactors from "../types/ScalingFactors";
import { COLOR_BLACK } from "./drawConstants";
import { gameToCanvasPosition } from "./drawUtil";
import { calcPanelOffset } from "./roomPanelDrawUtil";

const CUBOID_LINE_WIDTH_RATIO = 0.25;
const TEMP_ROOM_CUBOID_COLOR = "#c58b57";
const TEMP_ROOM_CUBOID_WIDTH_RATIO = 0.18;
const TEMP_ROOM_CUBOID_HEIGHT_RATIO = 1.1;
const TEMP_ROOM_CUBOID_Z = 0.3333;
const TEMP_ROOM_CUBOID_DEPTH = 0.3333;

function _drawFace(points:Array<[number, number]>, fillColor:string, context:CanvasRenderingContext2D) {
  context.fillStyle = fillColor;
  context.beginPath();
  context.moveTo(...points[0]);
  for (let pointIndex = 1; pointIndex < points.length; ++pointIndex) {
    context.lineTo(...points[pointIndex]);
  }
  context.closePath();
  context.fill();
}

function _strokeEdge(fromPoint:[number, number], toPoint:[number, number], scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  context.strokeStyle = COLOR_BLACK;
  context.lineWidth = scalingFactors.roomLineWidth * CUBOID_LINE_WIDTH_RATIO;
  context.beginPath();
  context.moveTo(...fromPoint);
  context.lineTo(...toPoint);
  context.stroke();
}

function _projectCuboidPoint(x:number, y:number, z:number, scalingFactors:ScalingFactors):[number, number] {
  const [canvasX, canvasY] = gameToCanvasPosition(x, y, scalingFactors);
  const [offsetX, offsetY] = calcPanelOffset(scalingFactors);
  return [canvasX + offsetX * z, canvasY + offsetY * z];
}

function _createTempRoomCenterCuboid(room:Room):Cuboid {
  const footprintWidth = Math.min(room.rect.width, room.rect.height) * TEMP_ROOM_CUBOID_WIDTH_RATIO;
  const cuboidHeight = footprintWidth * TEMP_ROOM_CUBOID_HEIGHT_RATIO;
  return {
    x:room.rect.x + room.rect.width / 2 - footprintWidth / 2,
    y:room.rect.y + room.rect.height - cuboidHeight,
    z:TEMP_ROOM_CUBOID_Z,
    width:footprintWidth,
    height:cuboidHeight,
    depth:TEMP_ROOM_CUBOID_DEPTH
  };
}

export function drawCuboid(cuboid:Cuboid, color:string, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const frontZ = cuboid.z + cuboid.depth;
  const backTopLeft = _projectCuboidPoint(cuboid.x, cuboid.y, cuboid.z, scalingFactors);
  const backTopRight = _projectCuboidPoint(cuboid.x + cuboid.width, cuboid.y, cuboid.z, scalingFactors);
  const backBottomLeft = _projectCuboidPoint(cuboid.x, cuboid.y + cuboid.height, cuboid.z, scalingFactors);
  const frontTopLeft = _projectCuboidPoint(cuboid.x, cuboid.y, frontZ, scalingFactors);
  const frontTopRight = _projectCuboidPoint(cuboid.x + cuboid.width, cuboid.y, frontZ, scalingFactors);
  const frontBottomLeft = _projectCuboidPoint(cuboid.x, cuboid.y + cuboid.height, frontZ, scalingFactors);
  const frontBottomRight = _projectCuboidPoint(cuboid.x + cuboid.width, cuboid.y + cuboid.height, frontZ, scalingFactors);

  _drawFace([backTopLeft, backTopRight, frontTopRight, frontTopLeft], color, context);
  _drawFace([backTopLeft, backBottomLeft, frontBottomLeft, frontTopLeft], color, context);
  _drawFace([frontTopLeft, frontTopRight, frontBottomRight, frontBottomLeft], color, context);

  _strokeEdge(backTopLeft, backTopRight, scalingFactors, context);
  _strokeEdge(backTopLeft, backBottomLeft, scalingFactors, context);
  _strokeEdge(backTopLeft, frontTopLeft, scalingFactors, context);
  _strokeEdge(backTopRight, frontTopRight, scalingFactors, context);
  _strokeEdge(backBottomLeft, frontBottomLeft, scalingFactors, context);
  _strokeEdge(frontTopLeft, frontTopRight, scalingFactors, context);
  _strokeEdge(frontTopRight, frontBottomRight, scalingFactors, context);
  _strokeEdge(frontBottomRight, frontBottomLeft, scalingFactors, context);
  _strokeEdge(frontBottomLeft, frontTopLeft, scalingFactors, context);
}

export function drawTemporaryRoomCenterCuboid(room:Room, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  drawCuboid(_createTempRoomCenterCuboid(room), TEMP_ROOM_CUBOID_COLOR, scalingFactors, context);
}