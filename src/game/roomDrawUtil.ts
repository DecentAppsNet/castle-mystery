import { drawVisibleCharactersInRoom, drawVisibilityCone } from "./characterDrawUtil";
import { createObstructionBoundarySegments } from "./obstructionUtil";
import { processRoomEffects } from "./effects/effectUtil";
import { COLOR_ACTIVE_ROOM_FILL, COLOR_BLACK, COLOR_DARK_GRAY, COLOR_INACTIVE_ROOM_FILL, COLOR_ROOM_TITLE_TEXT } from "./drawConstants";
import { gameToCanvasPosition } from "./drawUtil";
import { drawDiscoveredItemsInRoom } from "./itemDrawUtil";
import Character from "./types/Character";
import Obstruction from "./types/Obstruction";
import Room from "./types/Room";
import RoomExit from "./types/RoomExit";
import ScalingFactors from "./types/ScalingFactors";
import Effect from "./effects/types/Effect";
import ImageSet from "./types/ImageSet";

function drawRoomExit(exit:RoomExit, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const { roomLineWidth } = scalingFactors;
  const [exitX, exitY] = gameToCanvasPosition(exit.x, exit.y, scalingFactors);
  const left = exitX - roomLineWidth;
  const top = exitY - roomLineWidth;
  const width = roomLineWidth * 3;
  const height = roomLineWidth * 3;
  context.fillStyle = COLOR_BLACK;
  context.lineWidth = roomLineWidth;
  context.fillRect(left, top, width, height);
}

function drawObstruction(obstruction:Obstruction, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const obstructionRects = obstruction.rects.map(rect => {
    const [left, top] = gameToCanvasPosition(rect.x, rect.y, scalingFactors);
    const [right, bottom] = gameToCanvasPosition(rect.x + rect.width, rect.y + rect.height, scalingFactors);
    return { left, top, width:right - left, height:bottom - top };
  });
  const minLeft = obstructionRects.reduce((minValue, rect) => Math.min(minValue, rect.left), Number.POSITIVE_INFINITY);
  const minTop = obstructionRects.reduce((minValue, rect) => Math.min(minValue, rect.top), Number.POSITIVE_INFINITY);
  const maxRight = obstructionRects.reduce((maxValue, rect) => Math.max(maxValue, rect.left + rect.width), Number.NEGATIVE_INFINITY);
  const maxBottom = obstructionRects.reduce((maxValue, rect) => Math.max(maxValue, rect.top + rect.height), Number.NEGATIVE_INFINITY);
  const maxHeight = obstructionRects.reduce((maxValue, rect) => Math.max(maxValue, rect.height), 0);
  const hatchSpacing = Math.max(6, scalingFactors.roomLineWidth * 3);
  context.save();
  context.fillStyle = COLOR_INACTIVE_ROOM_FILL;
  context.beginPath();
  obstructionRects.forEach(rect => context.rect(rect.left, rect.top, rect.width, rect.height));
  context.fill();
  context.beginPath();
  obstructionRects.forEach(rect => context.rect(rect.left, rect.top, rect.width, rect.height));
  context.clip();
  context.strokeStyle = COLOR_BLACK;
  context.lineWidth = Math.max(0.5, scalingFactors.roomLineWidth / 2);
  for (let lineX = minLeft - maxHeight; lineX <= maxRight; lineX += hatchSpacing) {
    context.beginPath();
    context.moveTo(lineX, maxBottom);
    context.lineTo(lineX + maxHeight, minTop);
    context.stroke();
  }
  context.strokeStyle = COLOR_BLACK;
  context.lineWidth = scalingFactors.roomLineWidth;
  createObstructionBoundarySegments(obstruction).forEach(segment => {
    const [startX, startY] = gameToCanvasPosition(segment.start.x, segment.start.y, scalingFactors);
    const [endX, endY] = gameToCanvasPosition(segment.end.x, segment.end.y, scalingFactors);
    context.beginPath();
    context.moveTo(startX, startY);
    context.lineTo(endX, endY);
    context.stroke();
  });
  context.restore();
}

export function drawRoom(room:Room, charactersInRoom:Character[], isActive:boolean, activeCharacter:Character|null,
  effects:Effect[], scalingFactors:ScalingFactors, context:CanvasRenderingContext2D, time:number, isPlaying:boolean, imageSet:ImageSet) {
  if (!room.isDiscovered) return;
  const scaledTopLeft = gameToCanvasPosition(room.rect.x, room.rect.y, scalingFactors);
  const scaledBottomRight = gameToCanvasPosition(room.rect.x + room.rect.width, room.rect.y + room.rect.height, scalingFactors);
  const scaledWidth = scaledBottomRight[0] - scaledTopLeft[0];
  const scaledHeight = scaledBottomRight[1] - scaledTopLeft[1];
  context.lineWidth = scalingFactors.roomLineWidth;
  context.fillStyle = room.isObscured ? COLOR_BLACK : (isActive ? COLOR_ACTIVE_ROOM_FILL : COLOR_INACTIVE_ROOM_FILL);
  context.fillRect(scaledTopLeft[0], scaledTopLeft[1], scaledWidth, scaledHeight);
  context.strokeStyle = COLOR_DARK_GRAY;
  context.strokeRect(scaledTopLeft[0], scaledTopLeft[1], scaledWidth, scaledHeight);
  if (!room.isObscured) room.obstructions.forEach(obstruction => drawObstruction(obstruction, scalingFactors, context));
  if (!room.isObscured && isActive && activeCharacter) {
    drawVisibilityCone(activeCharacter, room, scalingFactors, context);
    drawDiscoveredItemsInRoom(room, effects, scalingFactors, context);
  }
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `${scalingFactors.roomFontHeight}px Jellee`;
  if (isActive) {
    context.lineWidth = Math.max(1, scalingFactors.roomLineWidth);
    context.strokeStyle = COLOR_BLACK;
    context.strokeText(room.title, scaledTopLeft[0] + scaledWidth / 2, scaledTopLeft[1] + scaledHeight / 2);
  }
  context.fillStyle = COLOR_ROOM_TITLE_TEXT;
  context.fillText(room.title, scaledTopLeft[0] + scaledWidth / 2, scaledTopLeft[1] + scaledHeight / 2);
  if (room.isObscured) return;
  context.fillStyle = COLOR_BLACK;
  room.exits.forEach(exit => drawRoomExit(exit, scalingFactors, context));
  if (isActive && activeCharacter) {
    drawVisibleCharactersInRoom(room, charactersInRoom, activeCharacter, effects, scalingFactors, context, time, isPlaying, imageSet);
  }
  processRoomEffects(room, effects, context, isActive);
}