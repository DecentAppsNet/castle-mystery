/* This module groups room-focused drawing helpers, including room shells, exits, and in-room contents. */

import { drawObscuredActiveCharacter, drawVisibleCharactersInRoom } from "./characterDrawUtil";
import { findExitImageUrl, UNKNOWN_DOOR_IMAGE_URL } from "../exitImageUtil";
import { processRoomEffects } from "../effects/effectUtil";
import { COLOR_ACTIVE_ROOM_FILL, COLOR_BLACK, COLOR_DARK_GRAY, COLOR_INACTIVE_ROOM_FILL, COLOR_ROOM_TITLE_TEXT } from "./drawConstants";
import { gameToCanvasPosition } from "./drawUtil";
import { getExitCanvasRectForImageUrl } from "./exitDrawUtil";
import { drawDiscoveredItemsInRoom } from "./itemDrawUtil";
import { drawStairs } from "./stairDrawUtil";
import Character from "../types/Character";
import Room from "../types/Room";
import RoomExit from "../types/RoomExit";
import ScalingFactors from "../types/ScalingFactors";
import Effect from "../effects/types/Effect";
import ImageSet from "../types/ImageSet";
import ExitType from "../types/ExitType";

const OPEN_DOOR_NEARNESS = 2;

function _drawWaypointCrosshairs(room:Room, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const crosshairSize = Math.max(2, Math.round(scalingFactors.roomLineWidth * 1.5));
  context.strokeStyle = COLOR_BLACK;
  context.lineWidth = Math.max(1, scalingFactors.roomLineWidth / 2);

  room.waypoints.forEach(waypoint => {
    const [canvasX, canvasY] = gameToCanvasPosition(waypoint.position.x, waypoint.position.y, scalingFactors);
    context.beginPath();
    context.moveTo(canvasX - crosshairSize, canvasY);
    context.lineTo(canvasX + crosshairSize, canvasY);
    context.moveTo(canvasX, canvasY - crosshairSize);
    context.lineTo(canvasX, canvasY + crosshairSize);
    context.stroke();
  });
}

function _shouldDrawLeftRisingStairs(room:Room):boolean {
  return room.title.charCodeAt(0) % 2 === 1;
}

function _drawTemporaryRoomStairs(room:Room, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  if (room.rect.width !== room.rect.height) return;
  const fromPosition = _shouldDrawLeftRisingStairs(room)
    ? { x:room.rect.x + room.rect.width, y:room.rect.y }
    : { x:room.rect.x, y:room.rect.y };
  const toPosition = _shouldDrawLeftRisingStairs(room)
    ? { x:room.rect.x, y:room.rect.y + room.rect.height }
    : { x:room.rect.x + room.rect.width, y:room.rect.y + room.rect.height };
  drawStairs(fromPosition, toPosition, scalingFactors, context);
}

function _isCharacterNearExit(character:Character, exit:RoomExit):boolean {
  const dx = character.x - exit.x;
  const dy = character.y - exit.y;
  return dx * dx + dy * dy <= OPEN_DOOR_NEARNESS * OPEN_DOOR_NEARNESS;
}

function _findDisplayedExitType(exit:RoomExit, characters:Character[], isActive:boolean, showFullContents:boolean):ExitType {
  if (exit.exitType === ExitType.doorway) return exit.exitType;
  if (!showFullContents && !isActive) return exit.exitType;
  return characters.some(character => _isCharacterNearExit(character, exit)) ? ExitType.doorway : exit.exitType;
}

function _isExitAdjacentToActiveRoom(exit:RoomExit, activeRoom:Room|null):boolean {
  return !!activeRoom && (exit.room1Id === activeRoom.id || exit.room2Id === activeRoom.id);
}

function _findDisplayedExitImageUrl(exit:RoomExit, characters:Character[], activeRoom:Room|null, showFullContents:boolean):string {
  if (!showFullContents && !_isExitAdjacentToActiveRoom(exit, activeRoom)) return UNKNOWN_DOOR_IMAGE_URL;
  return findExitImageUrl(_findDisplayedExitType(exit, characters, true, showFullContents));
}

function drawRoomExit(exit:RoomExit, characters:Character[], activeRoom:Room|null, showFullContents:boolean,
  scalingFactors:ScalingFactors, context:CanvasRenderingContext2D, imageSet:ImageSet) {
  const displayedExitImageUrl = _findDisplayedExitImageUrl(exit, characters, activeRoom, showFullContents);
  const exitImage = imageSet.get(displayedExitImageUrl) || null;
  const { x:left, y:top, width, height } = getExitCanvasRectForImageUrl(exit, displayedExitImageUrl, scalingFactors, imageSet);
  if (exitImage) {
    context.drawImage(exitImage, left, top, width, height);
    return;
  }
  context.fillStyle = COLOR_BLACK;
  context.lineWidth = scalingFactors.roomLineWidth;
  context.fillRect(left, top, width, height);
}

export function drawRoom(room:Room, charactersInRoom:Character[], isActive:boolean, activeCharacter:Character|null,
  effects:Effect[], scalingFactors:ScalingFactors, context:CanvasRenderingContext2D, time:number, imageSet:ImageSet,
  allCharacters:Character[] = charactersInRoom, activeRoom:Room|null = null, showFullContents:boolean = false) {
  if (!room.isDiscovered) return;
  const isRoomObscured = room.isObscured && !showFullContents;
  const scaledTopLeft = gameToCanvasPosition(room.rect.x, room.rect.y, scalingFactors);
  const scaledBottomRight = gameToCanvasPosition(room.rect.x + room.rect.width, room.rect.y + room.rect.height, scalingFactors);
  const scaledWidth = scaledBottomRight[0] - scaledTopLeft[0];
  const scaledHeight = scaledBottomRight[1] - scaledTopLeft[1];
  context.lineWidth = scalingFactors.roomLineWidth;
  context.fillStyle = isRoomObscured ? COLOR_BLACK : (showFullContents || isActive ? COLOR_ACTIVE_ROOM_FILL : COLOR_INACTIVE_ROOM_FILL);
  context.fillRect(scaledTopLeft[0], scaledTopLeft[1], scaledWidth, scaledHeight);
  context.strokeStyle = COLOR_DARK_GRAY;
  context.strokeRect(scaledTopLeft[0], scaledTopLeft[1], scaledWidth, scaledHeight);
  _drawTemporaryRoomStairs(room, scalingFactors, context);
  if (!isRoomObscured && (showFullContents || (isActive && activeCharacter))) {
    drawDiscoveredItemsInRoom(room, effects, scalingFactors, context, { includeUndiscovered:true, ignoreRoomObscured:showFullContents });
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
  if (isRoomObscured) {
    room.exits.forEach(exit => drawRoomExit(exit, allCharacters, activeRoom, showFullContents, scalingFactors, context, imageSet));
    if (isActive && activeCharacter) drawObscuredActiveCharacter(room, scalingFactors, context);
    return;
  }
  context.fillStyle = COLOR_BLACK;
  room.exits.forEach(exit => drawRoomExit(exit, allCharacters, activeRoom, showFullContents, scalingFactors, context, imageSet));
  _drawWaypointCrosshairs(room, scalingFactors, context);
  if (showFullContents || (isActive && activeCharacter)) {
    const highlightedCharacter = activeCharacter || charactersInRoom[0] || null;
    if (highlightedCharacter) drawVisibleCharactersInRoom(charactersInRoom, highlightedCharacter, effects, scalingFactors, context, time, imageSet);
  }
  processRoomEffects(room, effects, context, isActive);
}
