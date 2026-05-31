/* This module groups top-level game-state drawing responsibilities, including scaling updates, full-scene rendering, and cursor-related popover drawing. */

import { assertNonNullable } from "decent-portal";

import { processLevelEffects } from "../effects/effectUtil";
import { findCharactersInRoom, findRoom, findRoomAtPosition } from "../roomUtil";
import GameState from "../types/GameState";
import Position, { duplicatePosition } from "../types/Position";
import RoomExit from "../types/RoomExit";
import ScalingFactors from "../types/ScalingFactors";
import ItineraryEventType from "../types/itineraryEvents/ItineraryEventType";
import WalkEvent from "../types/itineraryEvents/WalkEvent";
import { drawCharacterPopover } from "./characterDrawUtil";
import { COLOR_BLACK } from "./drawConstants";
import { drawExitPopover } from "./exitDrawUtil";
import { drawRoomCharactersAndEffects, drawRoomShell, drawRoomWaypointsWithHighlight } from "./roomDrawUtil";
import { calcScalingFactorsForRect, gameToCanvasPosition } from "./drawUtil";
import { drawItemPopover } from "./itemDrawUtil";
import { calcLevelCameraRect } from "../cameraUtil";
import { MAP_TILE_SIZE } from "../roomGridUtil";
import { getGroundImageAssetUrl } from "../imageUrlUtil";

const GROUND_HEIGHT_STORIES = 4;
const GROUND_Y_OFFSET = -1.8;

function _drawGround(gameState:GameState, context:CanvasRenderingContext2D) {
  const groundImage = gameState.imageSet.get(getGroundImageAssetUrl()) || null;
  if (!groundImage || groundImage.width <= 0 || groundImage.height <= 0) return;

  const groundHeight = MAP_TILE_SIZE * GROUND_HEIGHT_STORIES;
  const groundWidth = groundHeight * (groundImage.width / groundImage.height);
  const visibleLeftX = gameState.camera.currentRect.x;
  const visibleRightX = gameState.camera.currentRect.x + gameState.camera.currentRect.width;
  const firstTileI = Math.floor(visibleLeftX / groundWidth);
  const lastTileI = Math.ceil(visibleRightX / groundWidth);

  const groundY = gameState.groundFloorY + GROUND_Y_OFFSET;
  for (let tileI = firstTileI; tileI <= lastTileI; ++tileI) {
    const tileLeftX = tileI * groundWidth;
    const tileRightX = tileLeftX + groundWidth;
    const [canvasLeftX, canvasTopY] = gameToCanvasPosition(tileLeftX, groundY, gameState.scalingFactors);
    const [canvasRightX, canvasBottomY] = gameToCanvasPosition(tileRightX, groundY + groundHeight, gameState.scalingFactors);
    context.drawImage(groundImage, canvasLeftX, canvasTopY, canvasRightX - canvasLeftX, canvasBottomY - canvasTopY);
  }

  const [, groundCanvasBottomY] = gameToCanvasPosition(0, groundY + groundHeight, gameState.scalingFactors);
  if (groundCanvasBottomY < context.canvas.height) {
    context.fillStyle = COLOR_BLACK;
    context.fillRect(0, Math.max(0, groundCanvasBottomY), context.canvas.width, context.canvas.height - Math.max(0, groundCanvasBottomY));
  }
}

function _findHoveredItem(gameState:GameState) {
  if (!gameState.hoveredItemId) return null;
  const candidateRooms = gameState.isLevelComplete
    ? gameState.rooms.filter(room => room.isDiscovered)
    : gameState.rooms;
  for (const room of candidateRooms) {
    const hoveredItem = room.items.find(item => item.id === gameState.hoveredItemId && (gameState.isLevelComplete || item.isDiscovered)) || null;
    if (hoveredItem) return { room, item:hoveredItem };
  }
  return null;
}

function _findHoveredExit(gameState:GameState):RoomExit|null {
  if (!gameState.hoveredExitKey) return null;
  for (const room of gameState.rooms) {
    const hoveredExit = room.exits.find(exit => exit.id === gameState.hoveredExitKey) || null;
    if (hoveredExit) return hoveredExit;
  }
  return null;
}

function _findHighlightedWaypointPosition(gameState:GameState):Position|null {
  const activeCharacter = gameState.characters[gameState.activeCharacterI] || null;
  if (!activeCharacter) return null;

  let latestDestination:Position|null = activeCharacter.waypoint ? duplicatePosition(activeCharacter.waypoint.position) : null;
  for (const event of activeCharacter.itinerary) {
    if (event.type !== ItineraryEventType.WALK) continue;
    const walkEvent = event as WalkEvent;
    if (gameState.time < walkEvent.startTime) break;
    latestDestination = duplicatePosition(walkEvent.toWaypointPosition ?? walkEvent.toPosition);
    if (gameState.time < walkEvent.startTime + walkEvent.duration) return latestDestination;
  }
  return latestDestination;
}

export function updateScalingFactorsAsNeeded(gameState:GameState, context:CanvasRenderingContext2D):ScalingFactors {
  const destW = context.canvas.width;
  const destH = context.canvas.height;
  let scalingFactors = gameState.scalingFactors;
  assertNonNullable(scalingFactors);
  if (scalingFactors.destWidth !== destW || scalingFactors.destHeight !== destH
    || scalingFactors.sourceX !== gameState.camera.currentRect.x || scalingFactors.sourceY !== gameState.camera.currentRect.y
    || scalingFactors.sourceWidth !== gameState.camera.currentRect.width || scalingFactors.sourceHeight !== gameState.camera.currentRect.height) {
    scalingFactors = calcScalingFactorsForRect(gameState.camera.currentRect, destW, destH);
    const levelCameraRect = calcLevelCameraRect(gameState.rooms, destW / destH, gameState.groundFloorY);
    scalingFactors = {
      ...scalingFactors,
      roomLineWidth:Math.max(1, scalingFactors.roomLineWidth * (levelCameraRect.height / gameState.camera.currentRect.height))
    };
    gameState.scalingFactors = scalingFactors;
    gameState.activeEffects.length = 0;
  }
  return scalingFactors;
}

export function drawGameState(gameState:GameState, context:CanvasRenderingContext2D) {
  const activeCharacter = gameState.characters[gameState.activeCharacterI] || null;
  const highlightedWaypointPosition = _findHighlightedWaypointPosition(gameState);
  const activeRoom = activeCharacter ? findRoomAtPosition(gameState.rooms, activeCharacter.x, activeCharacter.y) : null;
  const drawnExitIds = new Set<string>();
  _drawGround(gameState, context);
  const roomRenderStates = gameState.rooms.map(room => {
    const charactersInRoom = findCharactersInRoom(room, gameState.characters);
    const isActive = activeCharacter ? charactersInRoom.some(character => character.id === activeCharacter.id) : false;
    return { room, charactersInRoom, isActive };
  });
  for (const { room, charactersInRoom, isActive } of roomRenderStates) {
    drawRoomShell(room, gameState.rooms, isActive, gameState.characters, drawnExitIds,
      gameState.groundFloorY, gameState.scalingFactors, context, gameState.isLevelComplete);
    if (!room.isDiscovered) continue;
    drawRoomCharactersAndEffects(room, charactersInRoom, isActive, activeCharacter, gameState.activeEffects,
      gameState.scalingFactors, context, gameState.time, gameState.imageSet, gameState.isLevelComplete);
    drawRoomWaypointsWithHighlight(room, gameState.scalingFactors, context,
      highlightedWaypointPosition, gameState.isLevelComplete);
  }
  const canShowHoverPopovers = gameState.isLevelComplete || !activeRoom?.isObscured;
  if (canShowHoverPopovers && gameState.hoveredItemId) {
    const hoveredItem = _findHoveredItem(gameState);
    if (hoveredItem) drawItemPopover(hoveredItem.room, hoveredItem.item, gameState.scalingFactors, context);
    processLevelEffects(gameState.activeEffects, context);
    return;
  }
  if (canShowHoverPopovers && gameState.hoveredCharacterId) {
    const hoveredCharacter = gameState.characters.find(character => character.id === gameState.hoveredCharacterId) || null;
    if (hoveredCharacter) drawCharacterPopover(hoveredCharacter, gameState.scalingFactors, context);
    processLevelEffects(gameState.activeEffects, context);
    return;
  }
  if (canShowHoverPopovers && gameState.hoveredExitKey) {
    const hoveredExit = _findHoveredExit(gameState);
    if (hoveredExit) {
      drawExitPopover(hoveredExit, findRoom(gameState.rooms, hoveredExit.room1Id), findRoom(gameState.rooms, hoveredExit.room2Id),
        gameState.itemsById, gameState.scalingFactors, context);
    }
  }
  processLevelEffects(gameState.activeEffects, context);
}
