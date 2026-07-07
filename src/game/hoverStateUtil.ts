/* This module groups pointer-hit testing and hover-driven state updates for characters, items, and exit popovers.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { assertNonNullable } from "decent-portal";

import { getExitHoverRect } from "./drawing/exitDrawUtil";
import { getCharacterHoverRect } from "./drawing/characterDrawUtil";
import { getItemHoverRect } from "./drawing/itemDrawUtil";
import { createDrawableContents } from "./drawing/roomDrawUtil";
import { createCharacterSelectEffect } from "./effects/characterSelectEffectUtil";
import { createPauseEffect } from "./effects/playPauseEffectUtil";
import { rebuildDynamicStateForTime } from "./dynamicStateRebuildUtil";
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
import ItineraryEventType from "./types/itineraryEvents/ItineraryEventType";
import { findCharacterDisplayPosition } from "./characterDisplayPositionUtil";
import { findActiveCharacter } from "./activeCharacterUtil";

const ROOM_NAVIGATION_TIME_OFFSET = 100;

function _recordViewedItem(gameState:GameState, item:{ id:string, title:string }) {
  gameState.viewedItemIds.add(item.id);
  gameState.viewedItemIds.add(item.title);
}

function _findHoveredRoomContent(gameState:GameState, room:Room, x:number, y:number) {
  const contents = createDrawableContents(room, findCharactersInRoom(room, gameState.characters), gameState.activeEffects, true);
  for (let i = contents.length - 1; i >= 0; --i) {
    const content = contents[i];
    if (content.type === 'item' && isPositionInOrOnRect(x, y, getItemHoverRect(room, content.item, gameState.scalingFactors, gameState.imageSet))) return content;
    if (content.type === 'character' && isCharacterInteractive(content.character)
      && isPositionInOrOnRect(x, y, getCharacterHoverRect(content.character, gameState.scalingFactors, gameState.time, gameState.imageSet, room))) return content;
  }
  return null;
}

function _findExitAtPosition(room:Room, x:number, y:number, gameState:GameState):RoomExit|null {
  for (let i = room.exits.length - 1; i >= 0; --i) {
    const exit = room.exits[i];
    const room1 = findRoom(gameState.rooms, exit.room1Id);
    const room2 = findRoom(gameState.rooms, exit.room2Id);
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

function _findClosestRoomEntryTime(gameState:GameState, character:Character, roomId:string):number|null {
  const roomEntryTimes = character.itinerary
    .filter(event => event.type === ItineraryEventType.ROOM_ENTRY && 'roomId' in event && event.roomId === roomId)
    .map(event => event.startTime);
  if (!roomEntryTimes.length) {
    const initialCharacter = gameState.initialCharacters.find(candidate => candidate.id === character.id) || null;
    const initialRoom = initialCharacter ? findRoomAtPosition(gameState.initialRooms, initialCharacter.position.x, initialCharacter.position.y) : null;
    if (initialRoom?.id === roomId) roomEntryTimes.push(0);
  }
  if (!roomEntryTimes.length) return null;
  return roomEntryTimes.reduce((closestTime, candidateTime) =>
    Math.abs(candidateTime - gameState.time) < Math.abs(closestTime - gameState.time) ? candidateTime : closestTime);
}

function _findActiveVisibleRoom(gameState:GameState):Room|null {
  const activeCharacter = findActiveCharacter(gameState);
  const activeRoom = activeCharacter ? findRoomAtPosition(gameState.rooms, activeCharacter.position.x, activeCharacter.position.y) : null;
  if (!activeRoom || (!gameState.isLevelComplete && activeRoom.isObscured)) return null;
  return activeRoom;
}

function _findVisibleHoveredRoom(gameState:GameState, x:number, y:number):Room|null {
  const hoveredRoom = findRoomAtPosition(gameState.rooms, x, y);
  if (!hoveredRoom?.isDiscovered || (!gameState.isLevelComplete && hoveredRoom.isObscured)) return null;
  return hoveredRoom;
}

function _findNavigableRoomAtPosition(gameState:GameState, x:number, y:number):Room|null {
  const hoveredRoom = _findVisibleHoveredRoom(gameState, x, y);
  if (!hoveredRoom) return null;
  if (_findHoveredRoomContent(gameState, hoveredRoom, x, y)) return null;
  const activeCharacter = findActiveCharacter(gameState);
  const activeRoom = activeCharacter ? findRoomAtPosition(gameState.rooms, activeCharacter.position.x, activeCharacter.position.y) : null;
  if (activeRoom?.id === hoveredRoom.id) return null;
  return _findExitAtPosition(hoveredRoom, x, y, gameState) ? null : hoveredRoom;
}

function _adjustRoomNavigationTime(gameState:GameState, time:number):number {
  const levelEndTime = gameState.startTime + gameState.duration;
  return Math.min(levelEndTime, time + ROOM_NAVIGATION_TIME_OFFSET); // Adding the offset lets the character arrive in the room instead of being on the door - looks better.
}

function _jumpToRoomTime(gameState:GameState, roomId:string, metaTime:number) {
  const activeCharacter = findActiveCharacter(gameState);
  let targetCharacter = activeCharacter;
  let targetTime = activeCharacter ? _findClosestRoomEntryTime(gameState, activeCharacter, roomId) : null;
  if (targetTime === null) {
    let bestFallbackCharacter:Character|null = null;
    let bestFallbackTime:number|null = null;
    gameState.characters.forEach(character => {
      if (!character.discoveredRoomIds.includes(roomId)) return;
      const candidateTime = _findClosestRoomEntryTime(gameState, character, roomId);
      if (candidateTime === null) return;
      if (bestFallbackTime === null || Math.abs(candidateTime - gameState.time) < Math.abs(bestFallbackTime - gameState.time)) {
        bestFallbackCharacter = character;
        bestFallbackTime = candidateTime;
      }
    });
    if (!bestFallbackCharacter || bestFallbackTime === null) return;
    targetCharacter = bestFallbackCharacter;
    targetTime = bestFallbackTime;
  }
  if (targetTime === null) return;
  targetTime = _adjustRoomNavigationTime(gameState, targetTime);

  const wasPlaying = gameState.isPlaying;
  const targetCharacterId = targetCharacter?.id || null;
  if (targetCharacterId) gameState.activeCharacterId = targetCharacterId;
  gameState.activeEffects.length = 0;
  rebuildDynamicStateForTime(gameState, targetTime, undefined, metaTime);
  gameState.isPlaying = false;
  gameState.realTimeToGameTimeOffset = 0;
  const rebuiltTargetCharacter = targetCharacterId
    ? gameState.characters.find(character => character.id === targetCharacterId) || null
    : null;
  if (rebuiltTargetCharacter) gameState.activeCharacterId = rebuiltTargetCharacter.id;
  if (rebuiltTargetCharacter) {
    const rebuiltTargetRoom = findRoomAtPosition(gameState.rooms, rebuiltTargetCharacter.position.x, rebuiltTargetCharacter.position.y);
    gameState.activeEffects.push(createCharacterSelectEffect(rebuiltTargetCharacter,
      findCharacterDisplayPosition(rebuiltTargetCharacter, rebuiltTargetRoom), metaTime, gameState.scalingFactors));
  }
  if (wasPlaying) gameState.activeEffects.push(createPauseEffect(metaTime, gameState.scalingFactors.roomLineWidth));
}

function _findInteractiveCharacterAtPosition(gameState:GameState, x:number, y:number):Character|null {
  const interactionRoom = gameState.isLevelComplete
    ? _findVisibleHoveredRoom(gameState, x, y)
    : _findActiveVisibleRoom(gameState);
  if (!interactionRoom && !gameState.isLevelComplete) {
    const activeCharacter = findActiveCharacter(gameState);
    const activeRoom = activeCharacter ? findRoomAtPosition(gameState.rooms, activeCharacter.position.x, activeCharacter.position.y) : null;
    if (activeRoom?.isObscured) return null;
  }
  const hoveredContent = interactionRoom ? _findHoveredRoomContent(gameState, interactionRoom, x, y) : null;
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

export function updateGameStateForMouseDown(gameState:GameState, event:MouseDownEvent, metaTime:number) {
  const character = _findInteractiveCharacterAtPosition(gameState, event.x, event.y);
  if (character) {
    gameState.activeCharacterId = character.id;
    const characterRoom = findRoomAtPosition(gameState.rooms, character.position.x, character.position.y);
    gameState.activeEffects.push(createCharacterSelectEffect(character,
      findCharacterDisplayPosition(character, characterRoom), metaTime, gameState.scalingFactors));
    return;
  }
  const room = _findNavigableRoomAtPosition(gameState, event.x, event.y);
  if (room) _jumpToRoomTime(gameState, room.id, metaTime);
}

export function updateGameStateForMouseMove(gameState:GameState, event:MouseMoveEvent) {
  const interactionRoom = _findHoverInteractionRoom(gameState, event.x, event.y);
  if (!interactionRoom) {
    _clearHoverTargets(gameState);
    return;
  }
  const hoveredContent = _findHoveredRoomContent(gameState, interactionRoom, event.x, event.y);
  const hoveredItem = hoveredContent?.type === 'item' ? hoveredContent.item : null;
  gameState.hoveredItemId = hoveredItem?.id ?? null;
  if (hoveredItem) _recordViewedItem(gameState, hoveredItem);
  gameState.hoveredCharacterId = hoveredContent?.type === 'character' ? hoveredContent.character.id : null;
  const hoveredExit = !hoveredItem && !gameState.hoveredCharacterId ? _findExitAtPosition(interactionRoom, event.x, event.y, gameState) : null;
  gameState.hoveredExitKey = hoveredExit?.id ?? null;
  gameState.hoveredRoomId = !hoveredItem && !gameState.hoveredCharacterId && !hoveredExit ? _findNavigableRoomAtPosition(gameState, event.x, event.y)?.id ?? null : null;
}