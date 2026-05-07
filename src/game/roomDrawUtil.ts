import { drawVisibleCharactersInRoom, drawVisibilityCone } from "./characterDrawUtil";
import { COLOR_ACTIVE_ROOM_FILL, COLOR_BLACK, COLOR_DARK_GRAY, COLOR_INACTIVE_ROOM_FILL, COLOR_ROOM_TITLE_TEXT } from "./drawConstants";
import { gameToCanvasPosition } from "./drawUtil";
import { discoverVisibleItemsInRoom, drawDiscoveredItemsInRoom } from "./itemDrawUtil";
import Character from "./types/Character";
import Obstruction from "./types/Obstruction";
import Room from "./types/Room";
import RoomExit from "./types/RoomExit";
import ScalingFactors from "./types/ScalingFactors";

export function drawRoomExit(exit:RoomExit, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
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

export function drawObstruction(obstruction:Obstruction, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const [left, top] = gameToCanvasPosition(obstruction.rect.x, obstruction.rect.y, scalingFactors);
  const [right, bottom] = gameToCanvasPosition(
    obstruction.rect.x + obstruction.rect.width,
    obstruction.rect.y + obstruction.rect.height,
    scalingFactors
  );
  const width = right - left;
  const height = bottom - top;
  const hatchSpacing = Math.max(6, scalingFactors.roomLineWidth * 3);
  context.save();
  context.fillStyle = COLOR_INACTIVE_ROOM_FILL;
  context.fillRect(left, top, width, height);
  context.beginPath();
  context.rect(left, top, width, height);
  context.clip();
  context.strokeStyle = COLOR_BLACK;
  context.lineWidth = Math.max(0.5, scalingFactors.roomLineWidth / 2);
  for (let lineX = left - height; lineX <= right; lineX += hatchSpacing) {
    context.beginPath();
    context.moveTo(lineX, bottom);
    context.lineTo(lineX + height, top);
    context.stroke();
  }
  context.strokeStyle = COLOR_BLACK;
  context.lineWidth = scalingFactors.roomLineWidth;
  context.strokeRect(left, top, width, height);
  context.restore();
}

export function drawRoom(room:Room, charactersInRoom:Character[], isActive:boolean, activeCharacter:Character|null,
  scalingFactors:ScalingFactors, context:CanvasRenderingContext2D, time:number, isPlaying:boolean) {
  if (!room.isDiscovered) return;
  const scaledTopLeft = gameToCanvasPosition(room.rect.x, room.rect.y, scalingFactors);
  const scaledBottomRight = gameToCanvasPosition(room.rect.x + room.rect.width, room.rect.y + room.rect.height, scalingFactors);
  const scaledWidth = scaledBottomRight[0] - scaledTopLeft[0];
  const scaledHeight = scaledBottomRight[1] - scaledTopLeft[1];
  context.lineWidth = scalingFactors.roomLineWidth;
  context.fillStyle = isActive ? COLOR_ACTIVE_ROOM_FILL : COLOR_INACTIVE_ROOM_FILL;
  context.fillRect(scaledTopLeft[0], scaledTopLeft[1], scaledWidth, scaledHeight);
  room.obstructions.forEach(obstruction => drawObstruction(obstruction, scalingFactors, context));
  context.strokeStyle = COLOR_DARK_GRAY;
  context.strokeRect(scaledTopLeft[0], scaledTopLeft[1], scaledWidth, scaledHeight);
  if (isActive && activeCharacter) {
    discoverVisibleItemsInRoom(room, activeCharacter, scalingFactors);
    drawVisibilityCone(activeCharacter, room, scalingFactors, context);
    drawDiscoveredItemsInRoom(room, scalingFactors, context);
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
  context.fillStyle = COLOR_BLACK;
  room.exits.forEach(exit => drawRoomExit(exit, scalingFactors, context));
  if (isActive && activeCharacter) {
    drawVisibleCharactersInRoom(room, charactersInRoom, activeCharacter, scalingFactors, context, time, isPlaying);
  }
}