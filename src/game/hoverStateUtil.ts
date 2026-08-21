/* This module groups pointer-hit testing and hover-driven state updates for characters, items, and exit popovers.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { assertNonNullable } from "decent-portal";

import { getExitHoverRect } from "./drawing/exitDrawUtil";
import { getCharacterHoverRect } from "./drawing/characterDrawUtil";
import { getItemHoverRect } from "./drawing/itemDrawUtil";
import { createDrawableContents } from "./drawing/roomDrawUtil";
import { createCharacterSelectEffect } from "./effects/characterSelectEffectUtil";
import { isCharacterInteractive } from "./interactivityUtil";
import { isPositionInOrOnRect } from "./rectUtil";
import Character from "./types/Character";
import GameState from "./types/GameState";
import MouseDownEvent from "./types/playerEvents/MouseDownEvent";
import MouseMoveEvent from "./types/playerEvents/MouseMoveEvent";
import Room from "./types/Room";
import RoomExit from "./types/RoomExit";
import ExitType from "./types/ExitType";
import { findCharactersInRoom, findRoom, findRoomAtPosition } from "./roomUtil";
import { findCharacterDisplayPosition } from "./characterDisplayPositionUtil";
import { updateTimelineSnapshotActiveContext } from "./timeline";
import { createRoomContentDisplayLayout } from "./roomContentDisplayPositionUtil";

function _recordViewedItem(gameState:GameState, item:{ id:string, title:string }) {
  gameState.viewedItemIds.add(item.id);
  gameState.viewedItemIds.add(item.title);
}

function _findHoveredRoomContent(gameState:GameState, room:Room, characters:Character[], x:number, y:number) {
  const contents = createDrawableContents(room, findCharactersInRoom(room, characters), gameState.activeEffects,
    gameState.discoveryState.discoveredItemIds, true);
  for (let i = contents.length - 1; i >= 0; --i) {
    const content = contents[i];
    if (content.type === 'item' && isPositionInOrOnRect(x, y,
      getItemHoverRect(room, content.item, content.displayPosition, gameState.scalingFactors, gameState.imageSet))) return content;
    if (content.type === 'character' && isCharacterInteractive(content.character)
      && isPositionInOrOnRect(x, y, getCharacterHoverRect(content.character, gameState.scalingFactors, gameState.time, gameState.imageSet, room))) return content;
  }
  return null;
}

function _findExitAtPosition(room:Room, x:number, y:number, gameState:GameState):RoomExit|null {
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

function _findActiveVisibleRoom(gameState:GameState):Room|null {
  const activeRoom = gameState.timelineSnapshot.activeRoom;
  if (!gameState.isLevelComplete && gameState.discoveryState.obscuredRoomIds.has(activeRoom.id)) return null;
  return activeRoom;
}

function _findVisibleHoveredRoom(gameState:GameState, x:number, y:number):Room|null {
  const hoveredRoom = findRoomAtPosition(gameState.baseRooms, x, y);
  if (!hoveredRoom || !gameState.discoveryState.discoveredRoomIds.has(hoveredRoom.id)
    || (!gameState.isLevelComplete && gameState.discoveryState.obscuredRoomIds.has(hoveredRoom.id))) return null;
  return hoveredRoom;
}

function _findNavigableRoomAtPosition(gameState:GameState, characters:Character[], x:number, y:number):Room|null {
  const hoveredRoom = _findVisibleHoveredRoom(gameState, x, y);
  if (!hoveredRoom) return null;
  if (_findHoveredRoomContent(gameState, hoveredRoom, characters, x, y)) return null;
  if (gameState.timelineSnapshot.activeRoom.id === hoveredRoom.id) return null;
  return _findExitAtPosition(hoveredRoom, x, y, gameState) ? null : hoveredRoom;
}

function _findInteractiveCharacterAtPosition(gameState:GameState, characters:Character[], x:number, y:number):Character|null {
  const interactionRoom = gameState.isLevelComplete
    ? _findVisibleHoveredRoom(gameState, x, y)
    : _findActiveVisibleRoom(gameState);
  if (!interactionRoom && !gameState.isLevelComplete) {
    if (gameState.discoveryState.obscuredRoomIds.has(gameState.timelineSnapshot.activeRoom.id)) return null;
  }
  const hoveredContent = interactionRoom ? _findHoveredRoomContent(gameState, interactionRoom, characters, x, y) : null;
  return hoveredContent?.type === 'character' ? hoveredContent.character : null;
}

function _clearHoverTargets(gameState:GameState) {
  gameState.hoveredItemId = null;
  gameState.hoveredCharacterId = null;
  gameState.hoveredExitKey = null;
  gameState.hoveredRoomId = null;
}

function _findHoverInteractionRoom(gameState:GameState, x:number, y:number):Room|null {
  return gameState.isLevelComplete
    ? _findVisibleHoveredRoom(gameState, x, y)
    : _findActiveVisibleRoom(gameState);
}

export function updateGameStateForMouseDown(gameState:GameState, characters:Character[], event:MouseDownEvent, metaTime:number) {
  const character = _findInteractiveCharacterAtPosition(gameState, characters, event.x, event.y);
  if (character) {
    gameState.activeCharacterId = character.id;
    updateTimelineSnapshotActiveContext(gameState.timelineSnapshot, character.id);
    const displayLayout = createRoomContentDisplayLayout(gameState.timelineSnapshot.activeRoom, [character]);
    gameState.activeEffects.push(createCharacterSelectEffect(character,
      findCharacterDisplayPosition(character, displayLayout), metaTime, gameState.scalingFactors));
    return;
  }
}

export function updateGameStateForMouseMove(gameState:GameState, characters:Character[], event:MouseMoveEvent) {
  const interactionRoom = _findHoverInteractionRoom(gameState, event.x, event.y);
  if (!interactionRoom) {
    _clearHoverTargets(gameState);
    return;
  }
  const hoveredContent = _findHoveredRoomContent(gameState, interactionRoom, characters, event.x, event.y);
  const hoveredItem = hoveredContent?.type === 'item' ? hoveredContent.item : null;
  gameState.hoveredItemId = hoveredItem?.id ?? null;
  if (hoveredItem) _recordViewedItem(gameState, hoveredItem);
  gameState.hoveredCharacterId = hoveredContent?.type === 'character' ? hoveredContent.character.id : null;
  const hoveredExit = !hoveredItem && !gameState.hoveredCharacterId ? _findExitAtPosition(interactionRoom, event.x, event.y, gameState) : null;
  gameState.hoveredExitKey = hoveredExit?.id ?? null;
  gameState.hoveredRoomId = !hoveredItem && !gameState.hoveredCharacterId && !hoveredExit 
    ? _findNavigableRoomAtPosition(gameState, characters, event.x, event.y)?.id ?? null 
    : null;
}