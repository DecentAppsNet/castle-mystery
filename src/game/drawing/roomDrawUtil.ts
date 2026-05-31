/* This module groups room-focused drawing helpers, including room shells, exits, and in-room contents. */

import { DRAW_WAYPOINTS } from "@/developer/config";
import { drawCharacter, drawObscuredActiveCharacter } from "./characterDrawUtil";
import { processRoomEffects } from "../effects/effectUtil";
import {
  COLOR_ACTIVE_FLOOR_FILL,
  COLOR_ACTIVE_RIGHT_WALL_FILL,
  COLOR_ACTIVE_ROOM_FILL,
  COLOR_BLACK,
  COLOR_DARK_GRAY,
  COLOR_INACTIVE_FLOOR_FILL,
  COLOR_INACTIVE_RIGHT_WALL_FILL,
  COLOR_INACTIVE_ROOM_FILL,
  COLOR_ROOM_TITLE_TEXT
} from "./drawConstants";
import { interpolateColor } from "./colorUtil";
import { gameToCanvasPosition } from "./drawUtil";
import { drawTemporaryRightWallDoorVectorOverlay, getExitCanvasRect } from "./exitDrawUtil";
import { drawRoomItem, findVisibleRoomItemsInDrawOrder } from "./itemDrawUtil";
import { compareNonStairDrawableContents, mergeStairsWithSortedContents, RoomDrawableContent } from "./roomContentDrawOrderUtil";
import { calcPanelOffset, drawFloorPanel, drawRightWallPanel } from "./roomPanelDrawUtil";
import { drawRoomRoofs } from "./roomRoofDrawUtil";
import { drawStairPart } from "./stairDrawUtil";
import Character from "../types/Character";
import Position from "../types/Position";
import Room from "../types/Room";
import RoomExit from "../types/RoomExit";
import ScalingFactors from "../types/ScalingFactors";
import Effect from "../effects/types/Effect";
import ImageSet from "../types/ImageSet";
import ExitType from "../types/ExitType";
import StairPart, { StairPartType } from "../types/StairPart";
import { processCharacterEffects } from "../effects/effectUtil";

const OPEN_DOOR_NEARNESS = 2;
const ROOM_TITLE_OUTLINE_WIDTH_RATIO = 0.15;
const WAYPOINT_HIGHLIGHT_TOLERANCE = 0.01;
const WAYPOINT_BACKGROUND_START_COLOR = "#ffb3c1";
const WAYPOINT_BACKGROUND_END_COLOR = "#880000";
const WAYPOINT_HIGHLIGHT_START_COLOR = "#8fd8ff";
const WAYPOINT_HIGHLIGHT_END_COLOR = "#003d99";

function _getWaypointCanvasPosition(x:number, y:number, z:number, scalingFactors:ScalingFactors):[number, number] {
  const [canvasX, canvasY] = gameToCanvasPosition(x, y, scalingFactors);
  const [offsetX, offsetY] = calcPanelOffset(scalingFactors);
  const depth = Math.max(0, Math.min(1, z));
  return [canvasX + offsetX * depth, canvasY + offsetY * depth];
}

function _isCloseTo(value1:number, value2:number):boolean {
  return Math.abs(value1 - value2) <= WAYPOINT_HIGHLIGHT_TOLERANCE;
}

function _isSameWaypointPosition(highlightedPosition:Position|null, waypoint:Character['waypoint']):boolean {
  if (!highlightedPosition) return false;
  return _isCloseTo(highlightedPosition.x, waypoint.position.x)
    && _isCloseTo(highlightedPosition.y, waypoint.position.y)
    && _isCloseTo(highlightedPosition.z, waypoint.position.z);
}

function _isSameWaypointXY(highlightedPosition:Position|null, waypoint:Character['waypoint']):boolean {
  if (!highlightedPosition) return false;
  return _isCloseTo(highlightedPosition.x, waypoint.position.x)
    && _isCloseTo(highlightedPosition.y, waypoint.position.y);
}

function _calcWaypointColor(z:number):string {
  return interpolateColor(WAYPOINT_BACKGROUND_START_COLOR, WAYPOINT_BACKGROUND_END_COLOR, z);
}

function _calcHighlightedWaypointColor(z:number):string {
  return interpolateColor(WAYPOINT_HIGHLIGHT_START_COLOR, WAYPOINT_HIGHLIGHT_END_COLOR, z);
}

function _drawWaypointCrosshairs(room:Room, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D, highlightedPosition:Position|null = null) {
  const crosshairSize = Math.max(1, Math.round(scalingFactors.roomLineWidth * .5));

  context.save();
  context.strokeStyle = "#c00";
  context.lineWidth = Math.max(0.2, scalingFactors.roomLineWidth * 0.2);

  const hasExactHighlightedWaypoint = highlightedPosition !== null
    && room.waypoints.some(waypoint => _isSameWaypointPosition(highlightedPosition, waypoint));

  room.waypoints.forEach(waypoint => {
    const isHighlighted = hasExactHighlightedWaypoint
      ? _isSameWaypointPosition(highlightedPosition, waypoint)
      : _isSameWaypointXY(highlightedPosition, waypoint);
    const [canvasX, canvasY] = _getWaypointCanvasPosition(waypoint.position.x, waypoint.position.y, waypoint.position.z, scalingFactors);
    context.strokeStyle = isHighlighted ? _calcHighlightedWaypointColor(waypoint.position.z) : _calcWaypointColor(waypoint.position.z);
    context.beginPath();
    context.moveTo(canvasX - crosshairSize, canvasY);
    context.lineTo(canvasX + crosshairSize, canvasY);
    context.moveTo(canvasX, canvasY - crosshairSize);
    context.lineTo(canvasX, canvasY + crosshairSize);
    context.stroke();
  });

  context.restore();
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

function _drawRoomExit(room:Room, exit:RoomExit, characters:Character[], showFullContents:boolean,
  scalingFactors:ScalingFactors, context:CanvasRenderingContext2D, drawnExitIds:Set<string>) {
  if (!_shouldRoomDrawExit(room, exit)) return;
  if (drawnExitIds.has(exit.id)) return;
  drawnExitIds.add(exit.id);
  const displayedExitType = _findDisplayedExitType(exit, characters, showFullContents);
  const { height } = getExitCanvasRect(exit, scalingFactors);
  drawTemporaryRightWallDoorVectorOverlay(room, exit, displayedExitType, scalingFactors, context, height);
}

function _calcStairPartSortDepth(stairPart:StairPart):number {
  return stairPart.z;
}

function _calcStairPartSortX(stairPart:StairPart):number {
  switch(stairPart.type) {
    case StairPartType.flight:
      return (stairPart.startPosition.x + stairPart.endPosition.x) / 2;
    case StairPartType.landing:
    case StairPartType.catwalk:
      return stairPart.leftX + stairPart.width / 2;
  }
}

export function drawRoomShell(room:Room, rooms:ReadonlyArray<Room>, isActive:boolean, characters:Character[], drawnExitIds:Set<string>,
  scalingFactors:ScalingFactors, context:CanvasRenderingContext2D, showFullContents:boolean = false) {
  if (!room.isDiscovered) return;
  const isRoomObscured = room.isObscured && !showFullContents;
  const scaledTopLeft = gameToCanvasPosition(room.rect.x, room.rect.y, scalingFactors);
  const scaledBottomRight = gameToCanvasPosition(room.rect.x + room.rect.width, room.rect.y + room.rect.height, scalingFactors);
  const scaledWidth = scaledBottomRight[0] - scaledTopLeft[0];
  const scaledHeight = scaledBottomRight[1] - scaledTopLeft[1];
  context.lineWidth = scalingFactors.roomLineWidth;
  context.fillStyle = isRoomObscured ? COLOR_BLACK : (showFullContents || isActive ? COLOR_ACTIVE_ROOM_FILL : COLOR_INACTIVE_ROOM_FILL);
  context.strokeStyle = COLOR_DARK_GRAY;
  if (!room.isOutside) {
    context.fillRect(scaledTopLeft[0], scaledTopLeft[1], scaledWidth, scaledHeight);
    context.strokeRect(scaledTopLeft[0], scaledTopLeft[1], scaledWidth, scaledHeight);
  }
  context.fillStyle = isRoomObscured
    ? COLOR_BLACK
    : (showFullContents || isActive ? COLOR_ACTIVE_FLOOR_FILL : COLOR_INACTIVE_FLOOR_FILL);
  drawFloorPanel(room, scalingFactors, context);
  context.fillStyle = isRoomObscured
    ? COLOR_BLACK
    : (showFullContents || isActive ? COLOR_ACTIVE_RIGHT_WALL_FILL : COLOR_INACTIVE_RIGHT_WALL_FILL);
  drawRightWallPanel(room, rooms, scalingFactors, context);
  room.exits.forEach(exit => _drawRoomExit(room, exit, characters, showFullContents, scalingFactors, context, drawnExitIds));
  drawRoomRoofs(room, rooms, scalingFactors, context);
  if (room.title.length === 0) return;
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
}

function _createDrawableContents(room:Room, charactersInRoom:Character[], effects:Effect[], includeUndiscoveredItems:boolean):RoomDrawableContent[] {
  const stairContents = room.stairParts.map((stairPart, stairIndex) => ({
    type:'stair' as const,
    depth:_calcStairPartSortDepth(stairPart),
    x:_calcStairPartSortX(stairPart),
    sortId:`stair-${stairIndex}`,
    stairPart
  }));
  const sortedNonStairContents = [
    ...charactersInRoom.map(character => ({ type:'character' as const, depth:character.depth, x:character.x, sortId:character.id, character })),
    ...findVisibleRoomItemsInDrawOrder(room, effects, includeUndiscoveredItems)
      .map(item => ({ type:'item' as const, depth:item.position.z, x:item.position.x, sortId:item.id, item }))
  ].sort(compareNonStairDrawableContents);

  return mergeStairsWithSortedContents(stairContents, sortedNonStairContents);
}

function _drawRoomContents(room:Room, charactersInRoom:Character[], activeCharacter:Character|null, effects:Effect[],
  scalingFactors:ScalingFactors, context:CanvasRenderingContext2D, time:number, imageSet:ImageSet, includeUndiscoveredItems:boolean) {
  _createDrawableContents(room, charactersInRoom, effects, includeUndiscoveredItems).forEach(content => {
    switch(content.type) {
      case 'stair':
        drawStairPart(content.stairPart, scalingFactors, context);
        return;
      case 'item':
        drawRoomItem(room, content.item, scalingFactors, context);
        return;
      case 'character':
        drawCharacter(content.character, scalingFactors, context, time, imageSet, content.character.id === activeCharacter?.id);
        processCharacterEffects(content.character, effects, context);
        return;
    }
  });
}

function _drawRoomStairsOnly(room:Room, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  room.stairParts.forEach(stairPart => drawStairPart(stairPart, scalingFactors, context));
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
  } else {
    _drawRoomStairsOnly(room, scalingFactors, context);
  }
  processRoomEffects(room, effects, context, isActive);
}

export function drawRoomWaypoints(room:Room, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D, showFullContents:boolean = false) {
  if (!DRAW_WAYPOINTS || !room.isDiscovered) return;
  if (room.isObscured && !showFullContents) return;
  _drawWaypointCrosshairs(room, scalingFactors, context);
}

export function drawRoomWaypointsWithHighlight(room:Room, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D,
  highlightedPosition:Position|null = null, showFullContents:boolean = false) {
  if (!DRAW_WAYPOINTS || !room.isDiscovered) return;
  if (room.isObscured && !showFullContents) return;
  _drawWaypointCrosshairs(room, scalingFactors, context, highlightedPosition);
}
