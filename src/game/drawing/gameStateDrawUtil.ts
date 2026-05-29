/* This module groups top-level game-state drawing responsibilities, including scaling updates, full-scene rendering, and cursor-related popover drawing. */

import { assertNonNullable } from "decent-portal";

import { processLevelEffects } from "../effects/effectUtil";
import { findCharactersInRoom, findRoom, findRoomAtPosition } from "../roomUtil";
import GameState from "../types/GameState";
import RoomExit from "../types/RoomExit";
import ScalingFactors from "../types/ScalingFactors";
import { drawCharacterPopover } from "./characterDrawUtil";
import { drawExitPopover } from "./exitDrawUtil";
import { drawRoomCharactersAndEffects, drawRoomExit, drawRoomShell } from "./roomDrawUtil";
import { calcScalingFactorsForRect } from "./drawUtil";
import { drawItemPopover } from "./itemDrawUtil";
import { calcLevelCameraRect } from "../cameraUtil";

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

export function updateScalingFactorsAsNeeded(gameState:GameState, context:CanvasRenderingContext2D):ScalingFactors {
  const destW = context.canvas.width;
  const destH = context.canvas.height;
  let scalingFactors = gameState.scalingFactors;
  assertNonNullable(scalingFactors);
  if (scalingFactors.destWidth !== destW || scalingFactors.destHeight !== destH
    || scalingFactors.sourceX !== gameState.camera.currentRect.x || scalingFactors.sourceY !== gameState.camera.currentRect.y
    || scalingFactors.sourceWidth !== gameState.camera.currentRect.width || scalingFactors.sourceHeight !== gameState.camera.currentRect.height) {
    scalingFactors = calcScalingFactorsForRect(gameState.camera.currentRect, destW, destH);
    const levelCameraRect = calcLevelCameraRect(gameState.rooms, destW / destH);
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
  const activeRoom = activeCharacter ? findRoomAtPosition(gameState.rooms, activeCharacter.x, activeCharacter.y) : null;
  const drawnExitIds = new Set<string>();
  const roomRenderStates = gameState.rooms.map(room => {
    const charactersInRoom = findCharactersInRoom(room, gameState.characters);
    const isActive = activeCharacter ? charactersInRoom.some(character => character.id === activeCharacter.id) : false;
    return { room, charactersInRoom, isActive };
  });
  for (const { room, isActive } of roomRenderStates) {
    drawRoomShell(room, isActive, gameState.scalingFactors, context, gameState.isLevelComplete);
  }
  for (const { room } of roomRenderStates) {
    if (!room.isDiscovered) continue;
    room.exits.forEach(exit => drawRoomExit(room, exit, gameState.characters, gameState.isLevelComplete,
      gameState.scalingFactors, context, drawnExitIds));
  }
  for (const { room, charactersInRoom, isActive } of roomRenderStates) {
    drawRoomCharactersAndEffects(room, charactersInRoom, isActive, activeCharacter, gameState.activeEffects,
      gameState.scalingFactors, context, gameState.time, gameState.imageSet, gameState.isLevelComplete);
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
