/* This file handles pointer hover targets, viewed items, and room navigation targets.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import GameState from "../types/GameState";
import MouseMoveEvent from "./types/MouseMoveEvent";
import Room from "../types/Room";
import CharacterWithEffects from "../types/CharacterWithEffects";
import { findActiveVisibleRoom, findVisibleHoveredRoom, findHoveredRoomContent, findExitAtPosition } from "./hoverStateUtil";

function _recordViewedItem(gameState:GameState, item:{ id:string, title:string }) {
  gameState.viewedItemIds.add(item.id);
  gameState.viewedItemIds.add(item.title);
}

function _findNavigableRoomAtPosition(gameState:GameState, characters:CharacterWithEffects[], x:number, y:number):Room|null {
  const hoveredRoom = findVisibleHoveredRoom(gameState, x, y);
  if (!hoveredRoom) return null;
  if (findHoveredRoomContent(gameState, hoveredRoom, characters, x, y)) return null;
  if (gameState.timelineSnapshot.activeRoom.id === hoveredRoom.id) return null;
  return findExitAtPosition(hoveredRoom, x, y, gameState) ? null : hoveredRoom;
}

function _clearHoverTargets(gameState:GameState) {
  gameState.hoveredItemId = null;
  gameState.hoveredCharacterId = null;
  gameState.hoveredExitKey = null;
  gameState.hoveredRoomId = null;
}

function _findHoverInteractionRoom(gameState:GameState, x:number, y:number):Room|null {
  return gameState.isLevelComplete
    ? findVisibleHoveredRoom(gameState, x, y)
    : findActiveVisibleRoom(gameState);
}

export function updateGameStateForMouseMove(gameState:GameState, snapshotCharacters:CharacterWithEffects[], event:MouseMoveEvent) {
  const interactionRoom = _findHoverInteractionRoom(gameState, event.x, event.y);
  if (!interactionRoom) {
    _clearHoverTargets(gameState);
    return;
  }
  const hoveredContent = findHoveredRoomContent(gameState, interactionRoom, snapshotCharacters, event.x, event.y);
  const hoveredItem = hoveredContent?.type === 'item' ? hoveredContent.item : null;
  gameState.hoveredItemId = hoveredItem?.id ?? null;
  if (hoveredItem) _recordViewedItem(gameState, hoveredItem);
  gameState.hoveredCharacterId = hoveredContent?.type === 'character' ? hoveredContent.character.id : null;
  const hoveredExit = !hoveredItem && !gameState.hoveredCharacterId ? findExitAtPosition(interactionRoom, event.x, event.y, gameState) : null;
  gameState.hoveredExitKey = hoveredExit?.id ?? null;
  gameState.hoveredRoomId = !hoveredItem && !gameState.hoveredCharacterId && !hoveredExit 
    ? _findNavigableRoomAtPosition(gameState, snapshotCharacters, event.x, event.y)?.id ?? null 
    : null;
}