/* This module groups room-focused drawing helpers, including room shells, exits, and in-room contents. */

import { drawObscuredActiveCharacter, drawVisibleCharactersInRoom } from "./characterDrawUtil";
import { processRoomEffects } from "../effects/effectUtil";
import { COLOR_ACTIVE_ROOM_FILL, COLOR_BLACK, COLOR_DARK_GRAY, COLOR_INACTIVE_ROOM_FILL, COLOR_ROOM_TITLE_TEXT } from "./drawConstants";
import { drawTemporaryRoomCenterCuboid } from "./cuboidDrawUtil";
import { gameToCanvasPosition } from "./drawUtil";
import { drawTemporaryRightWallDoorVectorOverlay, getExitCanvasRect } from "./exitDrawUtil";
import { drawDiscoveredItemsInRoom } from "./itemDrawUtil";
import { drawFloorPanel, drawRightWallPanel } from "./roomPanelDrawUtil";
import { drawRoomStairs } from "./stairDrawUtil";
import Character from "../types/Character";
import Room from "../types/Room";
import RoomExit from "../types/RoomExit";
import ScalingFactors from "../types/ScalingFactors";
import Effect from "../effects/types/Effect";
import ImageSet from "../types/ImageSet";
import ExitType from "../types/ExitType";

const OPEN_DOOR_NEARNESS = 2;
const DRAW_WAYPOINTS = false;
const ROOM_TITLE_OUTLINE_WIDTH_RATIO = 0.15;

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

function _isCharacterNearExit(character:Character, exit:RoomExit):boolean {
  const dx = character.x - exit.x;
  const dy = character.y - exit.y;
  return dx * dx + dy * dy <= OPEN_DOOR_NEARNESS * OPEN_DOOR_NEARNESS;
}

function _findDisplayedExitType(exit:RoomExit, characters:Character[], showFullContents:boolean):ExitType {
  if (exit.exitType === ExitType.doorway) return exit.exitType;
  if (!showFullContents) return exit.exitType;
  return characters.some(character => _isCharacterNearExit(character, exit)) ? ExitType.doorway : exit.exitType;
}

function _shouldRoomDrawExit(room:Room, exit:RoomExit):boolean {
  return exit.x === room.rect.x + room.rect.width;
}

export function drawRoomExit(room:Room, exit:RoomExit, characters:Character[], showFullContents:boolean,
  scalingFactors:ScalingFactors, context:CanvasRenderingContext2D, drawnExitIds:Set<string>) {
  if (!_shouldRoomDrawExit(room, exit)) return;
  if (drawnExitIds.has(exit.id)) return;
  drawnExitIds.add(exit.id);
  const displayedExitType = _findDisplayedExitType(exit, characters, showFullContents);
  const { height } = getExitCanvasRect(exit, scalingFactors);
  drawTemporaryRightWallDoorVectorOverlay(room, exit, displayedExitType, scalingFactors, context, height);
}

export function drawRoomShell(room:Room, isActive:boolean, activeCharacter:Character|null,
  effects:Effect[], scalingFactors:ScalingFactors, context:CanvasRenderingContext2D, showFullContents:boolean = false) {
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
  drawFloorPanel(room, scalingFactors, context);
  drawRightWallPanel(room, scalingFactors, context);
  drawRoomStairs(room, scalingFactors, context);
  if (!isRoomObscured) drawTemporaryRoomCenterCuboid(room, scalingFactors, context);
  if (!isRoomObscured && (showFullContents || (isActive && activeCharacter))) {
    drawDiscoveredItemsInRoom(room, effects, scalingFactors, context, { includeUndiscovered:true, ignoreRoomObscured:showFullContents });
  }
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `${scalingFactors.roomFontHeight}px Jellee`;
  if (isActive) {
    context.lineWidth = Math.max(1, scalingFactors.roomFontHeight * ROOM_TITLE_OUTLINE_WIDTH_RATIO);
    context.strokeStyle = COLOR_BLACK;
    context.strokeText(room.title, scaledTopLeft[0] + scaledWidth / 2, scaledTopLeft[1] + scaledHeight / 2);
  }
  context.fillStyle = COLOR_ROOM_TITLE_TEXT;
  context.fillText(room.title, scaledTopLeft[0] + scaledWidth / 2, scaledTopLeft[1] + scaledHeight / 2);
  if (isRoomObscured) return;
  context.fillStyle = COLOR_BLACK;
  if (DRAW_WAYPOINTS) _drawWaypointCrosshairs(room, scalingFactors, context);
}

export function drawRoomCharactersAndEffects(room:Room, charactersInRoom:Character[], isActive:boolean, activeCharacter:Character|null,
  effects:Effect[], scalingFactors:ScalingFactors, context:CanvasRenderingContext2D, time:number, imageSet:ImageSet,
  showFullContents:boolean = false) {
  if (!room.isDiscovered) return;
  const isRoomObscured = room.isObscured && !showFullContents;
  if (isRoomObscured) {
    if (isActive && activeCharacter) drawObscuredActiveCharacter(room, scalingFactors, context);
    return;
  }
  if (showFullContents || (isActive && activeCharacter)) {
    const highlightedCharacter = activeCharacter || charactersInRoom[0] || null;
    if (highlightedCharacter) drawVisibleCharactersInRoom(charactersInRoom, highlightedCharacter, effects, scalingFactors, context, time, imageSet);
  }
  processRoomEffects(room, effects, context, isActive);
}
