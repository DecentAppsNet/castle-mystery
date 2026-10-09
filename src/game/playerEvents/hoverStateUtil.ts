/* This file groups shared pointer-hit testing and room visibility helpers for player events.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assertNonNullable } from "decent-portal";
import { getExitHoverRect } from "../drawing/exitDrawUtil";
import { getCharacterHoverRect } from "../drawing/characterDrawUtil";
import { getItemHoverRect } from "../drawing/itemDrawUtil";
import { createDrawableContents } from "../drawing/roomDrawUtil";
import { isCharacterInteractive } from "../interactivityUtil";
import { isPositionInOrOnRect } from "../rectUtil";
import GameState from "../types/GameState";
import Room from "../types/Room";
import RoomExit from "../types/RoomExit";
import ExitType from "../types/ExitType";
import { findCharactersWithEffectsInRoom, findRoom, findRoomAtPosition } from "../roomUtil";
import CharacterWithEffects from "../types/CharacterWithEffects";
import { createRoomContentDisplayLayout } from "../roomContentDisplayPositionUtil";

export function findHoveredRoomContent(gameState:GameState, room:Room, characters:CharacterWithEffects[], x:number, y:number) {
  // Resolve the same movement-aware geometry used by room drawing.
  const charactersInRoom = findCharactersWithEffectsInRoom(room, characters);
  const displayLayout = createRoomContentDisplayLayout(room, charactersInRoom,
    gameState.timelineSnapshot.movingCharacterIds);
  const contents = createDrawableContents(room, charactersInRoom,
    gameState.discoveryState.discoveredItemIds, true, displayLayout);

  // Hit-test from front to back using the resolved drawable ordering.
  for (let i = contents.length - 1; i >= 0; --i) {
    const content = contents[i];
    if (content.type === 'item' && isPositionInOrOnRect(x, y,
      getItemHoverRect(content.item, content.displayPosition, gameState.scalingFactors, gameState.imageSet))) return content;
    if (content.type === 'character' && isCharacterInteractive(content.character)
      && isPositionInOrOnRect(x, y, getCharacterHoverRect(
        content.character, content.displayPosition, gameState.scalingFactors, gameState.time, gameState.imageSet))) return content;
  }
  return null;
}

export function findExitAtPosition(room:Room, x:number, y:number, gameState:GameState):RoomExit|null {
  for (let i = room.exits.length - 1; i >= 0; --i) {
    const exit = room.exits[i];
    const room1 = findRoom(gameState.baseRooms, exit.room1Id);
    const room2 = findRoom(gameState.baseRooms, exit.room2Id);
    assertNonNullable(room1, `room ${exit.room1Id} not found`);
    assertNonNullable(room2, `room ${exit.room2Id} not found`);
    if (exit.exitType === ExitType.doorway
      && room1.isOutside
      && room2.isOutside) continue;
    const rect = getExitHoverRect(exit, gameState.scalingFactors);
    const isInside = isPositionInOrOnRect(x, y, rect);
    if (isInside) return exit;
  }
  return null;
}

export function findActiveVisibleRoom(gameState:GameState):Room|null {
  const activeRoom = gameState.timelineSnapshot.activeRoom;
  if (!gameState.isLevelComplete && gameState.discoveryState.obscuredRoomIds.has(activeRoom.id)) return null;
  return activeRoom;
}

export function findVisibleHoveredRoom(gameState:GameState, x:number, y:number):Room|null {
  const hoveredRoom = findRoomAtPosition(gameState.baseRooms, x, y);
  if (!hoveredRoom || !gameState.discoveryState.discoveredRoomIds.has(hoveredRoom.id)
    || (!gameState.isLevelComplete && gameState.discoveryState.obscuredRoomIds.has(hoveredRoom.id))) return null;
  return hoveredRoom;
}