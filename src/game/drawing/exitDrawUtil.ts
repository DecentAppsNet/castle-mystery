import { describeExit } from "../exitUtil";
import Item from "../types/Item";
import { findExitImageUrl } from "../exitImageUtil";
import ExitType from "../types/ExitType";
import ImageSet from "../types/ImageSet";
import Rect from "../types/Rect";
import Room from "../types/Room";
import RoomExit from "../types/RoomExit";
import ScalingFactors from "../types/ScalingFactors";
import { gameToCanvasPosition } from "./drawUtil";
import { drawTextPopover } from "./popoverDrawUtil";

const EXIT_DRAW_WIDTH_MULTIPLIER = 6;
const FALLBACK_EXIT_HEIGHT_MULTIPLIER = 3;

function _getExitDrawHeightPixels(imageUrl:string, roomLineWidth:number, imageSet:ImageSet):number {
  const width = roomLineWidth * EXIT_DRAW_WIDTH_MULTIPLIER;
  const exitImage = imageSet.get(imageUrl) || null;
  return exitImage ? width * (exitImage.height / exitImage.width) : roomLineWidth * FALLBACK_EXIT_HEIGHT_MULTIPLIER;
}

export function getExitCanvasRectForImageUrl(exit:Pick<RoomExit, 'x' | 'y'>, imageUrl:string, scalingFactors:ScalingFactors, imageSet:ImageSet):Rect {
  const { roomLineWidth } = scalingFactors;
  const [exitX, exitY] = gameToCanvasPosition(exit.x, exit.y, scalingFactors);
  const width = roomLineWidth * EXIT_DRAW_WIDTH_MULTIPLIER;
  const height = _getExitDrawHeightPixels(imageUrl, roomLineWidth, imageSet);
  return {
    x: exitX - width / 2,
    y: exitY - height / 2,
    width,
    height
  };
}

export function getExitCanvasRect(exit:Pick<RoomExit, 'x' | 'y'>, exitType:ExitType, scalingFactors:ScalingFactors, imageSet:ImageSet):Rect {
  return getExitCanvasRectForImageUrl(exit, findExitImageUrl(exitType), scalingFactors, imageSet);
}

export function getExitHoverRect(exit:RoomExit, scalingFactors:ScalingFactors, imageSet:ImageSet):Rect {
  const canvasRect = getExitCanvasRect(exit, exit.exitType, scalingFactors, imageSet);
  return {
    x: exit.x - (canvasRect.width / 2) / scalingFactors.scaleX,
    y: exit.y - (canvasRect.height / 2) / scalingFactors.scaleY,
    width: canvasRect.width / scalingFactors.scaleX,
    height: canvasRect.height / scalingFactors.scaleY
  };
}

export function drawExitPopover(exit:RoomExit, room1:Room, room2:Room, itemsById:ReadonlyMap<string, Item>, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const [anchorX, anchorY] = gameToCanvasPosition(exit.x, exit.y, scalingFactors);
  drawTextPopover({ anchorX, anchorY, bodyTexts:[describeExit(exit, room1, room2, itemsById)], scalingFactors, context });
}