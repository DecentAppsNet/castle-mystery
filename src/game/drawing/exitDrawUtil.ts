import { describeExit } from "../exitUtil";
import Item from "../types/Item";
import ExitType from "../types/ExitType";
import Rect from "../types/Rect";
import Room from "../types/Room";
import RoomExit from "../types/RoomExit";
import ScalingFactors from "../types/ScalingFactors";
import { COLOR_BLACK } from "./drawConstants";
import { canvasToGamePosition, gameToCanvasPosition } from "./drawUtil";
import { drawTextPopover } from "./popoverDrawUtil";
import { calcPanelOffset } from "./roomPanelDrawUtil";

const DOOR_WIDTH_SCALE = 6.75;
const DOOR_HEIGHT_SCALE = DOOR_WIDTH_SCALE * 548 / 313;
const RIGHT_WALL_DOOR_LEFT_Z = 0.33333;
const RIGHT_WALL_DOOR_RIGHT_Z = 0.66667;
const DOOR_ARCH_HEIGHT_RATIO = 0.35;
const DOOR_ARCH_SAMPLE_COUNT = 12;
const DOOR_FILL_BROWN = "#766850";
const KEYHOLE_TOP_HEIGHT_RATIO = 0.18;
const KEYHOLE_STEM_HEIGHT_RATIO = 0.2;
const KEYHOLE_WIDTH_RATIO = 0.26;
const KEYHOLE_STEM_WIDTH_RATIO = 0.1;

function _getExitDrawHeightPixels(roomLineWidth:number):number {
  return roomLineWidth * DOOR_HEIGHT_SCALE;
}

export function getExitCanvasRect(exit:Pick<RoomExit, 'x' | 'y'>, scalingFactors:ScalingFactors):Rect {
  const { roomLineWidth } = scalingFactors;
  const [exitX, exitY] = gameToCanvasPosition(exit.x, exit.y, scalingFactors);
  const width = roomLineWidth * DOOR_WIDTH_SCALE;
  const height = _getExitDrawHeightPixels(roomLineWidth);
  return {
    x: exitX - width / 2,
    y: exitY - height,
    width,
    height
  };
}

function _projectRoomPointWithDepth(x:number, y:number, z:number, scalingFactors:ScalingFactors):[number, number] {
  const [canvasX, canvasY] = gameToCanvasPosition(x, y, scalingFactors);
  const [offsetX, offsetY] = calcPanelOffset(scalingFactors);
  return [canvasX + offsetX * z, canvasY + offsetY * z];
}

function _createProjectedDoorArchPoints(rightWallX:number, doorBottomY:number, doorHeight:number, scalingFactors:ScalingFactors):Array<[number, number]> {
  const archHeight = doorHeight * DOOR_ARCH_HEIGHT_RATIO;
  const shoulderY = doorBottomY - doorHeight + archHeight;
  const zCenter = (RIGHT_WALL_DOOR_LEFT_Z + RIGHT_WALL_DOOR_RIGHT_Z) / 2;
  const zRadius = (RIGHT_WALL_DOOR_RIGHT_Z - RIGHT_WALL_DOOR_LEFT_Z) / 2;
  const archPoints:Array<[number, number]> = [];

  for (let sampleIndex = 0; sampleIndex <= DOOR_ARCH_SAMPLE_COUNT; ++sampleIndex) {
    const progress = sampleIndex / DOOR_ARCH_SAMPLE_COUNT;
    const z = RIGHT_WALL_DOOR_RIGHT_Z - (RIGHT_WALL_DOOR_RIGHT_Z - RIGHT_WALL_DOOR_LEFT_Z) * progress;
    const normalizedZ = zRadius === 0 ? 0 : (z - zCenter) / zRadius;
    const y = shoulderY - archHeight * Math.sqrt(Math.max(0, 1 - normalizedZ * normalizedZ));
    archPoints.push(_projectRoomPointWithDepth(rightWallX, y, z, scalingFactors));
  }

  return archPoints;
}

function _createProjectedDoorOutlinePoints(rightWallX:number, doorBottomY:number, doorHeight:number,
  scalingFactors:ScalingFactors):Array<[number, number]> {
  const archHeight = doorHeight * DOOR_ARCH_HEIGHT_RATIO;
  const bottomLeft = _projectRoomPointWithDepth(rightWallX, doorBottomY, RIGHT_WALL_DOOR_LEFT_Z, scalingFactors);
  const bottomRight = _projectRoomPointWithDepth(rightWallX, doorBottomY, RIGHT_WALL_DOOR_RIGHT_Z, scalingFactors);
  const shoulderLeft = _projectRoomPointWithDepth(rightWallX, doorBottomY - doorHeight + archHeight, RIGHT_WALL_DOOR_LEFT_Z, scalingFactors);
  const shoulderRight = _projectRoomPointWithDepth(rightWallX, doorBottomY - doorHeight + archHeight, RIGHT_WALL_DOOR_RIGHT_Z, scalingFactors);
  const archPoints = _createProjectedDoorArchPoints(rightWallX, doorBottomY, doorHeight, scalingFactors);
  return [bottomLeft, bottomRight, shoulderRight, ...archPoints, shoulderLeft];
}

function _getProjectedDoorCanvasRect(exit:Pick<RoomExit, 'x' | 'y'>, scalingFactors:ScalingFactors):Rect {
  const doorHeightPixels = _getExitDrawHeightPixels(scalingFactors.roomLineWidth);
  const doorHeight = doorHeightPixels / scalingFactors.scaleY;
  const outlinePoints = _createProjectedDoorOutlinePoints(exit.x, exit.y, doorHeight, scalingFactors);
  const xValues = outlinePoints.map(([x]) => x);
  const yValues = outlinePoints.map(([, y]) => y);
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);
  return { x:minX, y:minY, width:maxX - minX, height:maxY - minY };
}

function _findDoorFillColor(exitType:ExitType):string {
  return exitType === ExitType.doorway ? "#fff" : DOOR_FILL_BROWN;
}

function _drawProjectedLockableDoorKeyhole(rightWallX:number, doorBottomY:number, doorHeight:number,
  scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const keyholeTopHeight = doorHeight * KEYHOLE_TOP_HEIGHT_RATIO;
  const keyholeStemHeight = doorHeight * KEYHOLE_STEM_HEIGHT_RATIO;
  const keyholeCenterY = doorBottomY - doorHeight * 0.48;
  const keyholeTopBottomY = keyholeCenterY + keyholeTopHeight / 2;
  const keyholeStemBottomY = keyholeTopBottomY + keyholeStemHeight;
  const zCenter = (RIGHT_WALL_DOOR_LEFT_Z + RIGHT_WALL_DOOR_RIGHT_Z) / 2;
  const keyholeHalfWidth = (RIGHT_WALL_DOOR_RIGHT_Z - RIGHT_WALL_DOOR_LEFT_Z) * KEYHOLE_WIDTH_RATIO / 2;
  const keyholeStemHalfWidth = (RIGHT_WALL_DOOR_RIGHT_Z - RIGHT_WALL_DOOR_LEFT_Z) * KEYHOLE_STEM_WIDTH_RATIO / 2;
  const topPoints:Array<[number, number]> = [];

  for (let sampleIndex = 0; sampleIndex <= DOOR_ARCH_SAMPLE_COUNT; ++sampleIndex) {
    const progress = sampleIndex / DOOR_ARCH_SAMPLE_COUNT;
    const z = zCenter + keyholeHalfWidth - keyholeHalfWidth * 2 * progress;
    const normalizedZ = keyholeHalfWidth === 0 ? 0 : (z - zCenter) / keyholeHalfWidth;
    const y = keyholeCenterY - keyholeTopHeight * 0.55 * Math.sqrt(Math.max(0, 1 - normalizedZ * normalizedZ));
    topPoints.push(_projectRoomPointWithDepth(rightWallX, y, z, scalingFactors));
  }

  const bottomRight = _projectRoomPointWithDepth(rightWallX, keyholeTopBottomY, zCenter + keyholeHalfWidth, scalingFactors);
  const stemTopRight = _projectRoomPointWithDepth(rightWallX, keyholeTopBottomY, zCenter + keyholeStemHalfWidth, scalingFactors);
  const stemBottomRight = _projectRoomPointWithDepth(rightWallX, keyholeStemBottomY, zCenter + keyholeStemHalfWidth, scalingFactors);
  const stemBottomLeft = _projectRoomPointWithDepth(rightWallX, keyholeStemBottomY, zCenter - keyholeStemHalfWidth, scalingFactors);
  const stemTopLeft = _projectRoomPointWithDepth(rightWallX, keyholeTopBottomY, zCenter - keyholeStemHalfWidth, scalingFactors);
  const bottomLeft = _projectRoomPointWithDepth(rightWallX, keyholeTopBottomY, zCenter - keyholeHalfWidth, scalingFactors);

  context.fillStyle = COLOR_BLACK;
  context.beginPath();
  context.moveTo(...bottomRight);
  topPoints.forEach(point => context.lineTo(...point));
  context.lineTo(...bottomLeft);
  context.lineTo(...stemTopLeft);
  context.lineTo(...stemBottomLeft);
  context.lineTo(...stemBottomRight);
  context.lineTo(...stemTopRight);
  context.closePath();
  context.fill();
}

export function drawTemporaryRightWallDoorVectorOverlay(room:Room, exit:RoomExit, displayedExitType:ExitType, scalingFactors:ScalingFactors,
  context:CanvasRenderingContext2D, doorHeightPixels:number) {
  const doorHeight = doorHeightPixels / scalingFactors.scaleY;
  const rightWallX = room.rect.x + room.rect.width;
  const doorBottomY = exit.y;
  const [bottomLeft, bottomRight, shoulderRight, ...remainingOutlinePoints] = _createProjectedDoorOutlinePoints(
    rightWallX, doorBottomY, doorHeight, scalingFactors);
  const shoulderLeft = remainingOutlinePoints[remainingOutlinePoints.length - 1];

  context.fillStyle = _findDoorFillColor(displayedExitType);
  context.beginPath();
  context.moveTo(...bottomLeft);
  context.lineTo(...bottomRight);
  context.lineTo(...shoulderRight);
  remainingOutlinePoints.forEach(point => context.lineTo(...point));
  context.lineTo(...shoulderLeft);
  context.closePath();
  context.fill();

  context.strokeStyle = COLOR_BLACK;
  context.lineWidth = scalingFactors.roomLineWidth * .5;
  context.beginPath();
  context.moveTo(...bottomLeft);
  context.lineTo(...bottomRight);
  context.lineTo(...shoulderRight);
  remainingOutlinePoints.forEach(point => context.lineTo(...point));
  context.lineTo(...shoulderLeft);
  context.closePath();
  context.stroke();

  if (displayedExitType === ExitType.lockableDoor) {
    _drawProjectedLockableDoorKeyhole(rightWallX, doorBottomY, doorHeight, scalingFactors, context);
  }
}

export function getExitHoverRect(exit:RoomExit, scalingFactors:ScalingFactors):Rect {
  const canvasRect = _getProjectedDoorCanvasRect(exit, scalingFactors);
  const [left, top] = canvasToGamePosition(canvasRect.x, canvasRect.y, scalingFactors);
  const [right, bottom] = canvasToGamePosition(canvasRect.x + canvasRect.width, canvasRect.y + canvasRect.height, scalingFactors);
  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top
  };
}

export function drawExitPopover(exit:RoomExit, room1:Room, room2:Room, itemsById:ReadonlyMap<string, Item>,
  scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const canvasRect = _getProjectedDoorCanvasRect(exit, scalingFactors);
  const anchorX = canvasRect.x + canvasRect.width / 2;
  const anchorY = canvasRect.y;
  drawTextPopover({ anchorX, anchorY, bodyTexts:[describeExit(exit, room1, room2, itemsById)], scalingFactors, context });
}