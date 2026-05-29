/* This module groups room-focused drawing helpers, including room shells, exits, and in-room contents. */

import { drawCharacter, drawObscuredActiveCharacter } from "./characterDrawUtil";
import { processRoomEffects } from "../effects/effectUtil";
import { COLOR_ACTIVE_ROOM_FILL, COLOR_BLACK, COLOR_DARK_GRAY, COLOR_INACTIVE_ROOM_FILL, COLOR_ROOM_TITLE_TEXT } from "./drawConstants";
import { gameToCanvasPosition } from "./drawUtil";
import { drawTemporaryRightWallDoorVectorOverlay, getExitCanvasRect } from "./exitDrawUtil";
import { drawRoomItem, findVisibleRoomItemsInDrawOrder } from "./itemDrawUtil";
import { drawFloorPanel, drawRightWallPanel } from "./roomPanelDrawUtil";
import Character from "../types/Character";
import Item from "../types/Item";
import Room from "../types/Room";
import RoomExit from "../types/RoomExit";
import ScalingFactors from "../types/ScalingFactors";
import Effect from "../effects/types/Effect";
import ImageSet from "../types/ImageSet";
import ExitType from "../types/ExitType";
import { processCharacterEffects } from "../effects/effectUtil";

const OPEN_DOOR_NEARNESS = 2;
const DRAW_WAYPOINTS = false;
const ROOM_TITLE_OUTLINE_WIDTH_RATIO = 0.15;

type RoomDrawableContent =
  | { kind:'character', depth:number, x:number, sortId:string, character:Character }
  | { kind:'item', depth:number, x:number, sortId:string, item:Item };

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

export function drawRoomShell(room:Room, isActive:boolean, characters:Character[], drawnExitIds:Set<string>,
  scalingFactors:ScalingFactors, context:CanvasRenderingContext2D, showFullContents:boolean = false) {
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
  room.exits.forEach(exit => drawRoomExit(room, exit, characters, showFullContents, scalingFactors, context, drawnExitIds));
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

function _createDrawableContents(room:Room, charactersInRoom:Character[], effects:Effect[], includeUndiscoveredItems:boolean):RoomDrawableContent[] {
  return [
    ...charactersInRoom.map(character => ({ kind:'character' as const, depth:character.depth, x:character.x, sortId:character.id, character })),
    ...findVisibleRoomItemsInDrawOrder(room, effects, includeUndiscoveredItems)
      .map(item => ({ kind:'item' as const, depth:item.position.z, x:item.position.x, sortId:item.id, item }))
  ].sort((content1, content2) =>
    content1.depth - content2.depth || content2.x - content1.x || content1.sortId.localeCompare(content2.sortId));
}

function _drawRoomContents(room:Room, charactersInRoom:Character[], activeCharacter:Character|null, effects:Effect[],
  scalingFactors:ScalingFactors, context:CanvasRenderingContext2D, time:number, imageSet:ImageSet, includeUndiscoveredItems:boolean) {
  _createDrawableContents(room, charactersInRoom, effects, includeUndiscoveredItems).forEach(content => {
    if (content.kind === 'item') {
      drawRoomItem(room, content.item, scalingFactors, context);
      return;
    }
    drawCharacter(content.character, scalingFactors, context, time, imageSet, content.character.id === activeCharacter?.id);
    processCharacterEffects(content.character, effects, context);
  });
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
    _drawRoomContents(room, charactersInRoom, activeCharacter, effects, scalingFactors, context, time, imageSet, true);
  }
  processRoomEffects(room, effects, context, isActive);
}
