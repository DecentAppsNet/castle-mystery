/* This module groups room-exit drawing and hover-hit helpers for doors, locks, and exit items.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import CanvasLayoutPlanner from "@/game/CanvasLayoutPlanner";
import { describeExit } from "../exitUtil";
import Item from "../types/Item";
import ExitType from "../types/ExitType";
import Rect from "../types/Rect";
import Room from "../types/Room";
import RoomExit from "../types/RoomExit";
import ScalingFactors from "../types/ScalingFactors";
import { COLOR_BLACK } from "./drawColorConstants";
import { canvasToGamePosition, gameToCanvasPosition } from "./drawUtil";
import { drawTextPopover } from "./popoverDrawUtil";
import {
  createProjectedRightWallDoorOutlinePoints,
  getRightWallDoorHeightPixels,
  projectRoomPointWithDepth,
  RIGHT_WALL_DOOR_LEFT_Z,
  RIGHT_WALL_DOOR_RIGHT_Z
} from "./roomPanelProjectionUtil";

const DOOR_WIDTH_HEIGHT_RATIO = 313 / 548;
const DOOR_FILL_BROWN = "#766850";
const KEYHOLE_TOP_HEIGHT_RATIO = 0.18;
const KEYHOLE_STEM_HEIGHT_RATIO = 0.2;
const KEYHOLE_WIDTH_RATIO = 0.26;
const KEYHOLE_STEM_WIDTH_RATIO = 0.1;

function _getExitDrawHeightPixels(scalingFactors:ScalingFactors):number {
  return getRightWallDoorHeightPixels(scalingFactors);
}

function _getExitDrawWidthPixels(scalingFactors:ScalingFactors):number {
  return _getExitDrawHeightPixels(scalingFactors) * DOOR_WIDTH_HEIGHT_RATIO;
}

export function getExitCanvasRect(exit:Pick<RoomExit, 'x' | 'y'>, scalingFactors:ScalingFactors):Rect {
  const [exitX, exitY] = gameToCanvasPosition(exit.x, exit.y, scalingFactors);
  const width = _getExitDrawWidthPixels(scalingFactors);
  const height = _getExitDrawHeightPixels(scalingFactors);
  return {
    x: exitX - width / 2,
    y: exitY - height,
    width,
    height
  };
}

function _getProjectedDoorCanvasRect(exit:Pick<RoomExit, 'x' | 'y'>, scalingFactors:ScalingFactors):Rect {
  const doorHeightPixels = _getExitDrawHeightPixels(scalingFactors);
  const doorHeight = doorHeightPixels / scalingFactors.scaleY;
  const outlinePoints = createProjectedRightWallDoorOutlinePoints(exit.x, exit.y, doorHeight, scalingFactors);
  const xValues = outlinePoints.map(([x]) => x);
  const yValues = outlinePoints.map(([, y]) => y);
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);
  return { x:minX, y:minY, width:maxX - minX, height:maxY - minY };
}

export function getProjectedExitCanvasRect(exit:Pick<RoomExit, 'x' | 'y'>, scalingFactors:ScalingFactors):Rect {
  return _getProjectedDoorCanvasRect(exit, scalingFactors);
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

  for (let sampleIndex = 0; sampleIndex <= 12; ++sampleIndex) {
    const progress = sampleIndex / 12;
    const z = zCenter + keyholeHalfWidth - keyholeHalfWidth * 2 * progress;
    const normalizedZ = keyholeHalfWidth === 0 ? 0 : (z - zCenter) / keyholeHalfWidth;
    const y = keyholeCenterY - keyholeTopHeight * 0.55 * Math.sqrt(Math.max(0, 1 - normalizedZ * normalizedZ));
    topPoints.push(projectRoomPointWithDepth(rightWallX, y, z, scalingFactors));
  }

  const bottomRight = projectRoomPointWithDepth(rightWallX, keyholeTopBottomY, zCenter + keyholeHalfWidth, scalingFactors);
  const stemTopRight = projectRoomPointWithDepth(rightWallX, keyholeTopBottomY, zCenter + keyholeStemHalfWidth, scalingFactors);
  const stemBottomRight = projectRoomPointWithDepth(rightWallX, keyholeStemBottomY, zCenter + keyholeStemHalfWidth, scalingFactors);
  const stemBottomLeft = projectRoomPointWithDepth(rightWallX, keyholeStemBottomY, zCenter - keyholeStemHalfWidth, scalingFactors);
  const stemTopLeft = projectRoomPointWithDepth(rightWallX, keyholeTopBottomY, zCenter - keyholeStemHalfWidth, scalingFactors);
  const bottomLeft = projectRoomPointWithDepth(rightWallX, keyholeTopBottomY, zCenter - keyholeHalfWidth, scalingFactors);

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
  context:CanvasRenderingContext2D, doorHeightPixels:number = _getExitDrawHeightPixels(scalingFactors)) {
  const doorHeight = doorHeightPixels / scalingFactors.scaleY;
  const rightWallX = room.rect.x + room.rect.width;
  const doorBottomY = exit.y;
  const [bottomLeft, bottomRight, shoulderRight, ...remainingOutlinePoints] = createProjectedRightWallDoorOutlinePoints(
    rightWallX, doorBottomY, doorHeight, scalingFactors);
  const shoulderLeft = remainingOutlinePoints[remainingOutlinePoints.length - 1];

  if (displayedExitType !== ExitType.doorway) {
    context.fillStyle = _findDoorFillColor(displayedExitType);
    context.beginPath();
    context.moveTo(...bottomLeft);
    context.lineTo(...bottomRight);
    context.lineTo(...shoulderRight);
    remainingOutlinePoints.forEach(point => context.lineTo(...point));
    context.lineTo(...shoulderLeft);
    context.closePath();
    context.fill();
  }

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
  const canvasRect = getProjectedExitCanvasRect(exit, scalingFactors);
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
  scalingFactors:ScalingFactors, context:CanvasRenderingContext2D, layoutPlanner:CanvasLayoutPlanner|null = null) {
  const canvasRect = getProjectedExitCanvasRect(exit, scalingFactors);
  drawTextPopover({ targetRect:canvasRect, bodyTexts:[describeExit(exit, room1, room2, itemsById)], scalingFactors, context, layoutPlanner });
}