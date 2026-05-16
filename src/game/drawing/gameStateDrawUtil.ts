/* This module groups top-level game-state drawing responsibilities, including scaling updates, full-scene rendering, and cursor-related popover drawing. */

import { assertNonNullable } from "decent-portal";

import { processLevelEffects } from "../effects/effectUtil";
import { calcRoomsBoundingRect, findCharactersInRoom, findRoomAtPosition } from "../roomUtil";
import GameState from "../types/GameState";
import ScalingFactors from "../types/ScalingFactors";
import { drawCharacterPopover } from "./characterDrawUtil";
import { drawRoom } from "./roomDrawUtil";
import { calcScalingFactors } from "./drawUtil";
import { drawItemPopover } from "./itemDrawUtil";

function _findHoveredItem(gameState:GameState) {
  if (!gameState.hoveredItemId) return null;
  const candidateRooms = gameState.isLevelComplete
    ? gameState.rooms.filter(room => room.isDiscovered)
    : gameState.rooms;
  for (const room of candidateRooms) {
    const hoveredItem = room.items.find(item => item.id === gameState.hoveredItemId && (gameState.isLevelComplete || item.isDiscovered)) || null;
    if (hoveredItem) return hoveredItem;
  }
  return null;
}

export function updateScalingFactorsAsNeeded(gameState:GameState, context:CanvasRenderingContext2D):ScalingFactors {
  const destW = context.canvas.width;
  const destH = context.canvas.height;
  let scalingFactors = gameState.scalingFactors;
  assertNonNullable(scalingFactors);
  if (scalingFactors.destWidth !== destW || scalingFactors.destHeight !== destH) {
    const roomsBoundingRect = calcRoomsBoundingRect(gameState.rooms);
    scalingFactors = calcScalingFactors(roomsBoundingRect.width, roomsBoundingRect.height, destW, destH);
    gameState.scalingFactors = scalingFactors;
    gameState.activeEffects.length = 0;
  }
  return scalingFactors;
}

export function drawGameState(gameState:GameState, context:CanvasRenderingContext2D) {
  const activeCharacter = gameState.characters[gameState.activeCharacterI] || null;
  const activeRoom = activeCharacter ? findRoomAtPosition(gameState.rooms, activeCharacter.x, activeCharacter.y) : null;
  for(let roomI = 0; roomI < gameState.rooms.length; ++roomI) {
    const room = gameState.rooms[roomI];
    const charactersInRoom = findCharactersInRoom(room, gameState.characters);
    const isActive = activeCharacter ? charactersInRoom.some(character => character.id === activeCharacter.id) : false;
    drawRoom(room, charactersInRoom, isActive, activeCharacter, gameState.activeEffects, gameState.scalingFactors, context, gameState.time, gameState.imageSet,
      gameState.isLevelComplete);
  }
  const canShowHoverPopovers = gameState.isLevelComplete || !activeRoom?.isObscured;
  if (canShowHoverPopovers && gameState.hoveredItemId) {
    const hoveredItem = _findHoveredItem(gameState);
    if (hoveredItem) drawItemPopover(hoveredItem, gameState.scalingFactors, context);
    processLevelEffects(gameState.activeEffects, context);
    return;
  }
  if (canShowHoverPopovers && gameState.hoveredCharacterId) {
    const hoveredCharacter = gameState.characters.find(character => character.id === gameState.hoveredCharacterId) || null;
    if (hoveredCharacter) drawCharacterPopover(hoveredCharacter, gameState.scalingFactors, context);
  }
  processLevelEffects(gameState.activeEffects, context);
}
