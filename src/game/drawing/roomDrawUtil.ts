/* This module groups room-focused drawing helpers, including room shells, exits, and in-room contents.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { DRAW_WAYPOINTS } from "@/developer/config";
import CanvasLayoutPlanner from "@/game/CanvasLayoutPlanner";
import { isCharacterInteractive, isItemInteractive } from "@/game/interactivityUtil";
import { roomHeightToLayerCount, roomWidthToColumnCount } from "@/game/roomGridUtil";
import { drawCharacter, drawObscuredActiveCharacter } from "./characterDrawUtil";
import { processRoomEffects } from "../effects/effectUtil";
import {
  ACTIVE_BACK_WALL_TEXTURE_LIGHTNESS,
  ACTIVE_FLOOR_TEXTURE_LIGHTNESS,
  ACTIVE_RIGHT_WALL_TEXTURE_LIGHTNESS,
  COLOR_ACTIVE_FLOOR_FILL,
  COLOR_ACTIVE_RIGHT_WALL_FILL,
  COLOR_ACTIVE_ROOM_FILL,
  COLOR_BLACK,
  COLOR_DARK_GRAY,
  INACTIVE_BACK_WALL_TEXTURE_LIGHTNESS,
  INACTIVE_FLOOR_TEXTURE_LIGHTNESS,
  INACTIVE_RIGHT_WALL_TEXTURE_LIGHTNESS,
  COLOR_INACTIVE_FLOOR_FILL,
  COLOR_INACTIVE_RIGHT_WALL_FILL,
  COLOR_INACTIVE_ROOM_FILL,
  COLOR_ROOM_TITLE_TEXT
} from "./drawColorConstants";
import { interpolateColor } from "./colorUtil";
import { gameToCanvasPosition } from "./drawUtil";
import { drawTemporaryRightWallDoorVectorOverlay, getExitCanvasRect, getProjectedExitCanvasRect } from "./exitDrawUtil";
import { drawRoomItem, findVisibleRoomItemsInDrawOrder } from "./itemDrawUtil";
import { compareNonStairDrawableContents, mergeStairsWithSortedContents, RoomDrawableContent } from "./roomContentDrawOrderUtil";
import { wrapRoomTitle } from "./roomTitleLayoutUtil";
import { drawFloorPanel, drawRightWallPanel } from "./roomPanelDrawUtil";
import { calcPanelOffset, projectRoomPointWithDepth } from "./roomPanelProjectionUtil";
import { drawRoomRoofs } from "./roomRoofDrawUtil";
import { drawStairPart } from "./stairDrawUtil";
import { createTiledTextureFaceCanvas } from "./textureFaceDrawUtil";
import Character from "../types/Character";
import GameState from "../types/GameState";
import Position from "../types/Position";
import Room from "../types/Room";
import RoomExit from "../types/RoomExit";
import ScalingFactors from "../types/ScalingFactors";
import Effect from "../effects/types/Effect";
import ImageSet from "../types/ImageSet";
import ExitType from "../types/ExitType";
import StairPart, { StairPartType } from "../types/StairPart";
import { processAfterCharacterEffects, processBeforeCharacterEffects } from "../effects/effectUtil";
import { findCharacterDisplayPosition } from "@/game/characterDisplayPositionUtil";
import { findItemDisplayPosition } from "@/game/itemDisplayPositionUtil";
import { findRoom } from "../roomUtil";
import { getCharacterCanvasRect } from "./characterDrawUtil";
import { getItemCanvasRectInRoom } from "./itemDrawUtil";

const OPEN_DOOR_NEARNESS = 2;
const CX_ROOM_TITLE_MARGIN = 2;
const ROOM_TITLE_OUTLINE_WIDTH_RATIO = 0.15;
const WAYPOINT_HIGHLIGHT_TOLERANCE = 0.01;
const WAYPOINT_BACKGROUND_START_COLOR = "#ffb3c1";
const WAYPOINT_BACKGROUND_END_COLOR = "#880000";
const WAYPOINT_HIGHLIGHT_START_COLOR = "#8fd8ff";
const WAYPOINT_HIGHLIGHT_END_COLOR = "#003d99";

function _drawRoomBackWall(room:Room, imageSet:ImageSet|null, scaledTopLeft:[number, number], scaledWidth:number,
  scaledHeight:number, context:CanvasRenderingContext2D, textureLightness:number) {
  const backWallTexture = room.backWallTexture;
  const backWallImage = backWallTexture ? imageSet?.get(backWallTexture.imageUrl) || null : null;
  if (!backWallTexture || !backWallImage || backWallImage.width <= 0 || backWallImage.height <= 0) {
    context.fillRect(scaledTopLeft[0], scaledTopLeft[1], scaledWidth, scaledHeight);
    return;
  }

  const roomColumnCount = roomWidthToColumnCount(room.rect.width);
  const roomLayerCount = roomHeightToLayerCount(room.rect.height);
  const faceImage = createTiledTextureFaceCanvas(
    backWallImage,
    backWallTexture,
    roomColumnCount,
    roomLayerCount,
    textureLightness,
    `${room.id}|backWallTexture`
  );
  if (!faceImage) {
    context.fillRect(scaledTopLeft[0], scaledTopLeft[1], scaledWidth, scaledHeight);
    return;
  }

  context.save();
  context.beginPath();
  context.rect(scaledTopLeft[0], scaledTopLeft[1], scaledWidth, scaledHeight);
  context.clip();
  context.drawImage(faceImage.image, scaledTopLeft[0], scaledTopLeft[1], scaledWidth, scaledHeight);
  context.restore();
}

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
  const dx = character.position.x - exit.x;
  const dy = character.position.y - exit.y;
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
  rooms:ReadonlyArray<Room>, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D, drawnExitIds:Set<string>,
  layoutPlanner:CanvasLayoutPlanner|null = null) {
  if (!_shouldRoomDrawExit(room, exit)) return;
  if (drawnExitIds.has(exit.id)) return;
  drawnExitIds.add(exit.id);
  if (findRoom(rooms as Room[], exit.room1Id).isOutside && findRoom(rooms as Room[], exit.room2Id).isOutside) return;
  if (layoutPlanner) layoutPlanner.reserveRect(getProjectedExitCanvasRect(exit, scalingFactors));
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

export function drawCacheableRoomShell(room:Room, rooms:ReadonlyArray<Room>, isActive:boolean,
  groundFloorY:number, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D,
  showFullContents:boolean = false, includeUndiscovered:boolean = false, imageSet:ImageSet|null = null,
  includeRoof:boolean = true, renderObscuredState:boolean = true) {
  if (!includeUndiscovered && !room.isDiscovered) return;
  const isRoomObscured = renderObscuredState && room.isObscured && !showFullContents;
  const scaledTopLeft = gameToCanvasPosition(room.rect.x, room.rect.y, scalingFactors);
  const scaledBottomRight = gameToCanvasPosition(room.rect.x + room.rect.width, room.rect.y + room.rect.height, scalingFactors);
  const scaledWidth = scaledBottomRight[0] - scaledTopLeft[0];
  const scaledHeight = scaledBottomRight[1] - scaledTopLeft[1];
  const backWallTextureLightness = showFullContents || isActive ? ACTIVE_BACK_WALL_TEXTURE_LIGHTNESS : INACTIVE_BACK_WALL_TEXTURE_LIGHTNESS;
  const floorTextureLightness = showFullContents || isActive ? ACTIVE_FLOOR_TEXTURE_LIGHTNESS : INACTIVE_FLOOR_TEXTURE_LIGHTNESS;
  const rightWallTextureLightness = showFullContents || isActive ? ACTIVE_RIGHT_WALL_TEXTURE_LIGHTNESS : INACTIVE_RIGHT_WALL_TEXTURE_LIGHTNESS;
  context.lineWidth = scalingFactors.roomLineWidth;
  context.fillStyle = isRoomObscured ? COLOR_BLACK : (showFullContents || isActive ? COLOR_ACTIVE_ROOM_FILL : COLOR_INACTIVE_ROOM_FILL);
  context.strokeStyle = COLOR_DARK_GRAY;
  if (!room.isOutside) {
    _drawRoomBackWall(room, isRoomObscured ? null : imageSet, scaledTopLeft, scaledWidth, scaledHeight, context, backWallTextureLightness);
    context.strokeRect(scaledTopLeft[0], scaledTopLeft[1], scaledWidth, scaledHeight);
  }
  context.fillStyle = isRoomObscured
    ? COLOR_BLACK
    : (showFullContents || isActive ? COLOR_ACTIVE_FLOOR_FILL : COLOR_INACTIVE_FLOOR_FILL);
  drawFloorPanel(room, scalingFactors, context, isRoomObscured ? null : imageSet, floorTextureLightness);
  context.fillStyle = isRoomObscured
    ? COLOR_BLACK
    : (showFullContents || isActive ? COLOR_ACTIVE_RIGHT_WALL_FILL : COLOR_INACTIVE_RIGHT_WALL_FILL);
  drawRightWallPanel(room, rooms, scalingFactors, context, isRoomObscured ? null : imageSet, rightWallTextureLightness);
  if (includeRoof) drawRoomRoofs(room, rooms, groundFloorY, scalingFactors, context);
}

export function drawRoomShell(room:Room, rooms:ReadonlyArray<Room>, isActive:boolean, characters:Character[], drawnExitIds:Set<string>,
  groundFloorY:number, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D, showFullContents:boolean = false,
  layoutPlanner:CanvasLayoutPlanner|null = null, includeUndiscovered:boolean = false, imageSet:ImageSet|null = null) {
  if (!includeUndiscovered && !room.isDiscovered) return;
  drawCacheableRoomShell(room, rooms, isActive, groundFloorY, scalingFactors, context,
    showFullContents, includeUndiscovered, imageSet, false);
  drawRoomShellExits(room, rooms, characters, drawnExitIds, scalingFactors, context, showFullContents, layoutPlanner);
  drawRoomRoofs(room, rooms, groundFloorY, scalingFactors, context);
}

export function drawRoomShellExits(room:Room, rooms:ReadonlyArray<Room>, characters:Character[], drawnExitIds:Set<string>,
  scalingFactors:ScalingFactors, context:CanvasRenderingContext2D, showFullContents:boolean = false,
  layoutPlanner:CanvasLayoutPlanner|null = null) {
  if (!room.isDiscovered) return;
  room.exits.forEach(exit => _drawRoomExit(room, exit, characters, showFullContents, rooms, scalingFactors, context, drawnExitIds, layoutPlanner));
}

function _calcRoomTitleMaxWidth(room:Room, scalingFactors:ScalingFactors):number {
  const titleMargin = Math.min(CX_ROOM_TITLE_MARGIN, room.rect.width / 2);

  const [leftX] = projectRoomPointWithDepth(room.rect.x + titleMargin, room.rect.y + room.rect.height / 2, 1, scalingFactors);
  const [rightX] = projectRoomPointWithDepth(room.rect.x + room.rect.width - titleMargin, room.rect.y + room.rect.height / 2, 1, scalingFactors);
  return Math.max(0, rightX - leftX);
}

function _getWrappedRoomTitleLines(gameState:GameState, room:Room, context:CanvasRenderingContext2D):string[] {
  const cachedLines = gameState.roomTitleWrapsByRoomId.get(room.id);
  if (cachedLines) return cachedLines;

  const wrapScalingFactors = gameState.roomTitleWrapScalingFactors;
  const wrapFont = `${wrapScalingFactors.roomFontHeight}px Jellee`;
  const lines = wrapRoomTitle(room.title, _calcRoomTitleMaxWidth(room, wrapScalingFactors), titleText => {
    context.save();
    context.font = wrapFont;
    const measuredWidth = context.measureText(titleText).width;
    context.restore();
    return measuredWidth;
  });
  gameState.roomTitleWrapsByRoomId.set(room.id, lines);
  return lines;
}

function _getRoomTitleCanvasRect(room:Room, gameState:GameState, context:CanvasRenderingContext2D) {
  const scalingFactors = gameState.scalingFactors;
  const [centerX, centerY] = projectRoomPointWithDepth(
    room.rect.x + room.rect.width / 2,
    room.rect.y + room.rect.height / 2,
    1,
    scalingFactors
  );
  const lines = _getWrappedRoomTitleLines(gameState, room, context);
  context.save();
  context.font = `${scalingFactors.roomFontHeight}px Jellee`;
  const maxLineWidth = lines.reduce((maxWidth, line) => Math.max(maxWidth, context.measureText(line).width), 0);
  context.restore();
  const totalTextHeight = lines.length * scalingFactors.roomFontHeight;
  return {
    x:centerX - maxLineWidth / 2,
    y:centerY - totalTextHeight / 2,
    width:maxLineWidth,
    height:totalTextHeight
  };
}

export function drawRoomTitle(room:Room, isActive:boolean, gameState:GameState, context:CanvasRenderingContext2D,
  layoutPlanner:CanvasLayoutPlanner|null = null) {
  if (!room.isDiscovered) return;
  if (room.title.length === 0) return;

  if (layoutPlanner) layoutPlanner.reserveRect(_getRoomTitleCanvasRect(room, gameState, context));

  const scalingFactors = gameState.scalingFactors;
  const [centerX, centerY] = projectRoomPointWithDepth(
    room.rect.x + room.rect.width / 2,
    room.rect.y + room.rect.height / 2,
    1,
    scalingFactors
  );
  const font = `${scalingFactors.roomFontHeight}px Jellee`;
  const lines = _getWrappedRoomTitleLines(gameState, room, context);
  const lineHeight = scalingFactors.roomFontHeight;
  const totalTextHeight = lines.length * lineHeight;
  const firstLineCenterY = centerY - totalTextHeight / 2 + lineHeight / 2;

  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = font;
  context.fillStyle = COLOR_ROOM_TITLE_TEXT;
  if (isActive) {
    context.lineWidth = Math.max(1, scalingFactors.roomFontHeight * ROOM_TITLE_OUTLINE_WIDTH_RATIO);
    context.strokeStyle = COLOR_BLACK;
  }

  lines.forEach((line, lineIndex) => {
    const lineCenterY = firstLineCenterY + lineIndex * lineHeight;
    if (isActive) context.strokeText(line, centerX, lineCenterY);
    context.fillText(line, centerX, lineCenterY);
  });
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
    ...charactersInRoom.filter(character => character.isVisible).map(character => {
      const displayPosition = findCharacterDisplayPosition(character, room);
      return {
        type:'character' as const,
        depth:displayPosition.z,
        x:displayPosition.x,
        y:displayPosition.y,
        sortId:character.id,
        character
      };
    }),
    ...findVisibleRoomItemsInDrawOrder(room, effects, includeUndiscoveredItems)
      .map(item => {
        const displayPosition = findItemDisplayPosition(item, room);
        return {
          type:'item' as const,
          depth:displayPosition.z,
          x:displayPosition.x,
          y:displayPosition.y,
          sortId:item.id,
          item
        };
      })
  ].sort(compareNonStairDrawableContents);

  return mergeStairsWithSortedContents(stairContents, sortedNonStairContents);
}

function _drawRoomContents(room:Room, charactersInRoom:Character[], activeCharacter:Character|null, effects:Effect[],
  hoveredCharacterId:string|null, hoveredItemId:string|null, scalingFactors:ScalingFactors,
  context:CanvasRenderingContext2D, time:number, imageSet:ImageSet, includeUndiscoveredItems:boolean,
  layoutPlanner:CanvasLayoutPlanner|null = null) {
  _createDrawableContents(room, charactersInRoom, effects, includeUndiscoveredItems).forEach(content => {
    switch(content.type) {
      case 'stair':
        drawStairPart(content.stairPart, scalingFactors, context);
        return;
      case 'item':
        if (layoutPlanner && isItemInteractive(content.item)) layoutPlanner.reserveRect(getItemCanvasRectInRoom(room, content.item, scalingFactors, imageSet));
        drawRoomItem(room, content.item, scalingFactors, context, imageSet, content.item.id === hoveredItemId, time);
        return;
      case 'character':
        if (layoutPlanner && isCharacterInteractive(content.character)) layoutPlanner.reserveRect(getCharacterCanvasRect(content.character, scalingFactors, time, imageSet, room));
        processBeforeCharacterEffects(content.character, effects, context, scalingFactors, imageSet);
        drawCharacter(content.character, scalingFactors, context, time, imageSet, effects,
          content.character.id === activeCharacter?.id || content.character.id === hoveredCharacterId, room);
        processAfterCharacterEffects(content.character, effects, context, scalingFactors, imageSet);
        return;
    }
  });
}

function _drawRoomStairsOnly(room:Room, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  room.stairParts.forEach(stairPart => drawStairPart(stairPart, scalingFactors, context));
}

export function drawRoomCharactersAndEffects(room:Room, charactersInRoom:Character[], isActive:boolean, activeCharacter:Character|null,
  effects:Effect[], hoveredCharacterId:string|null, hoveredItemId:string|null, scalingFactors:ScalingFactors,
  context:CanvasRenderingContext2D, time:number, imageSet:ImageSet,
  showFullContents:boolean = false, layoutPlanner:CanvasLayoutPlanner|null = null) {
  if (!room.isDiscovered) return;
  const isRoomObscured = room.isObscured && !showFullContents;
  const canDrawEffect = showFullContents || isActive;
  if (isRoomObscured) {
    if (isActive && activeCharacter) drawObscuredActiveCharacter(room, scalingFactors, context);
    return;
  }
  if (showFullContents || (isActive && activeCharacter)) {
    _drawRoomContents(room, charactersInRoom, activeCharacter, effects, hoveredCharacterId, hoveredItemId,
      scalingFactors, context, time, imageSet, true, layoutPlanner);
  } else {
    _drawRoomStairsOnly(room, scalingFactors, context);
  }
  processRoomEffects(room, effects, context, scalingFactors, canDrawEffect, imageSet);
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
