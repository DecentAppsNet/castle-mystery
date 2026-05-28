/* This module groups pointer-hit testing and hover-driven state updates for characters, items, and exit popovers. */

import { getExitHoverRect } from "./drawing/exitDrawUtil";
import { findDiscoveredItemAtPosition } from "./drawing/itemDrawUtil";
import { createCharacterSelectEffect } from "./effects/characterSelectEffectUtil";
import { createPauseEffect } from "./effects/playPauseEffectUtil";
import { rebuildDynamicStateForTime } from "./dynamicStateRebuildUtil";
import Character from "./types/Character";
import GameState from "./types/GameState";
import MouseDownEvent from "./types/playerEvents/MouseDownEvent";
import MouseMoveEvent from "./types/playerEvents/MouseMoveEvent";
import Rect from "./types/Rect";
import Room from "./types/Room";
import RoomExit from "./types/RoomExit";
import ScalingFactors from "./types/ScalingFactors";
import { findCharactersInRoom, findRoomAtPosition } from "./roomUtil";
import ItineraryEventType from "./types/itineraryEvents/ItineraryEventType";

const ROOM_NAVIGATION_TIME_OFFSET = 100;

function _getCharacterBoundingRect(character:Character, scalingFactors:ScalingFactors):Rect {
  const roomLineWidth = scalingFactors.roomLineWidth;
  const characterWidthPixels = roomLineWidth * 15;
  const characterHeightPixels = roomLineWidth * 30;
  // character.x/character.y represent the bottom-center point in game position space
  const halfWidthGame = (characterWidthPixels / 2) / scalingFactors.scaleX;
  const heightGame = characterHeightPixels / scalingFactors.scaleY;
  const left = character.x - halfWidthGame;
  const top = character.y - heightGame;
  return { x: left, y: top, width: halfWidthGame * 2, height: heightGame };
}

function _recordViewedItem(gameState:GameState, item:{ id:string, title:string }) {
  gameState.viewedItemIds.add(item.id);
  gameState.viewedItemIds.add(item.title);
}

function _findExitAtPosition(room:Room, x:number, y:number, gameState:GameState):RoomExit|null {
  for (let i = room.exits.length - 1; i >= 0; --i) {
    const exit = room.exits[i];
    const rect = getExitHoverRect(exit, gameState.scalingFactors);
    const isInside = x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
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
    const initialRoom = initialCharacter ? findRoomAtPosition(gameState.initialRooms, initialCharacter.x, initialCharacter.y) : null;
    if (initialRoom?.id === roomId) roomEntryTimes.push(0);
  }
  if (!roomEntryTimes.length) return null;
  return roomEntryTimes.reduce((closestTime, candidateTime) =>
    Math.abs(candidateTime - gameState.time) < Math.abs(closestTime - gameState.time) ? candidateTime : closestTime);
}

function _findNavigableRoomAtPosition(gameState:GameState, x:number, y:number):Room|null {
  const hoveredRoom = findRoomAtPosition(gameState.rooms, x, y);
  if (!hoveredRoom?.isDiscovered) return null;
  const hoveredCharacter = findCharacterAtPosition(gameState, x, y);
  if (hoveredCharacter) return null;
  const activeCharacter = gameState.characters[gameState.activeCharacterI] || null;
  const activeRoom = activeCharacter ? findRoomAtPosition(gameState.rooms, activeCharacter.x, activeCharacter.y) : null;
  if (activeRoom?.id === hoveredRoom.id) return null;
  if (gameState.isLevelComplete) {
    const hoveredItem = findDiscoveredItemAtPosition(hoveredRoom, x, y, gameState.scalingFactors, { includeUndiscovered:true, ignoreRoomObscured:true });
    const hoveredExit = !hoveredItem ? _findExitAtPosition(hoveredRoom, x, y, gameState) : null;
    return hoveredItem || hoveredExit ? null : hoveredRoom;
  }
  return hoveredRoom;
}

function _adjustRoomNavigationTime(gameState:GameState, time:number):number {
  const levelEndTime = gameState.startTime + gameState.duration;
  return Math.min(levelEndTime, time + ROOM_NAVIGATION_TIME_OFFSET); // Adding the offset lets the character arrive in the room instead of being on the door - looks better.
}

function _jumpToRoomTime(gameState:GameState, roomId:string) {
  const activeCharacter = gameState.characters[gameState.activeCharacterI] || null;
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
  if (targetCharacterId) gameState.activeCharacterI = gameState.characters.findIndex(character => character.id === targetCharacterId);
  gameState.activeEffects.length = 0;
  rebuildDynamicStateForTime(gameState, targetTime);
  gameState.isPlaying = false;
  gameState.realTimeToGameTimeOffset = 0;
  const rebuiltTargetCharacter = targetCharacterId
    ? gameState.characters.find(character => character.id === targetCharacterId) || null
    : null;
  if (rebuiltTargetCharacter) gameState.activeCharacterI = gameState.characters.indexOf(rebuiltTargetCharacter);
  if (rebuiltTargetCharacter) gameState.activeEffects.push(createCharacterSelectEffect(rebuiltTargetCharacter, Date.now(), gameState.scalingFactors));
  if (wasPlaying) gameState.activeEffects.push(createPauseEffect(Date.now(), gameState.scalingFactors.roomLineWidth));
}

export function findCharacterAtPosition(gameState:GameState, x:number, y:number):Character|null {
  if (gameState.characters.length === 0) return null;
  if (gameState.isLevelComplete) {
    const hoveredRoom = findRoomAtPosition(gameState.rooms, x, y);
    if (!hoveredRoom?.isDiscovered) return null;
    const candidateCharacters = findCharactersInRoom(hoveredRoom, gameState.characters);
    if (candidateCharacters.length === 0) return null;

    let nearest:Character = candidateCharacters[0];
    let nearestDist = Math.hypot(nearest.x - x, nearest.y - y);
    for (let i = 1; i < candidateCharacters.length; ++i) {
      const character = candidateCharacters[i];
      const distance = Math.hypot(character.x - x, character.y - y);
      if (distance < nearestDist) {
        nearest = character;
        nearestDist = distance;
      }
    }

    const rect = _getCharacterBoundingRect(nearest, gameState.scalingFactors);
    if (x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height) return nearest;
    return null;
  }
  const activeCharacter = gameState.characters[gameState.activeCharacterI] || null;
  const activeRoom = activeCharacter ? findRoomAtPosition(gameState.rooms, activeCharacter.x, activeCharacter.y) : null;
  if (activeRoom?.isObscured) return null;
  const candidateCharacters = activeCharacter && activeRoom
    ? findCharactersInRoom(activeRoom, gameState.characters)
    : gameState.characters;
  if (candidateCharacters.length === 0) return null;

  let nearest:Character = candidateCharacters[0];
  let nearestDist = Math.hypot(nearest.x - x, nearest.y - y);
  for (let i = 1; i < candidateCharacters.length; ++i) {
    const character = candidateCharacters[i];
    const distance = Math.hypot(character.x - x, character.y - y);
    if (distance < nearestDist) {
      nearest = character;
      nearestDist = distance;
    }
  }

  const rect = _getCharacterBoundingRect(nearest, gameState.scalingFactors);
  if (x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height) return nearest;
  return null;
}

export function updateGameStateForMouseDown(gameState:GameState, event:MouseDownEvent) {
  const character = findCharacterAtPosition(gameState, event.x, event.y);
  if (character) {
    const characterI = gameState.characters.indexOf(character);
    gameState.activeCharacterI = characterI;
    gameState.activeEffects.push(createCharacterSelectEffect(character, Date.now(), gameState.scalingFactors));
    return;
  }
  const room = _findNavigableRoomAtPosition(gameState, event.x, event.y);
  if (room) _jumpToRoomTime(gameState, room.id);
}

export function updateGameStateForMouseMove(gameState:GameState, event:MouseMoveEvent) {
  if (gameState.isLevelComplete) {
    const hoveredRoom = findRoomAtPosition(gameState.rooms, event.x, event.y);
    if (!hoveredRoom?.isDiscovered) {
      gameState.hoveredItemId = null;
      gameState.hoveredCharacterId = null;
      gameState.hoveredExitKey = null;
      gameState.hoveredRoomId = null;
      return;
    }
    const hoveredItem = findDiscoveredItemAtPosition(hoveredRoom, event.x, event.y, gameState.scalingFactors,
      { includeUndiscovered:true, ignoreRoomObscured:true });
    if (hoveredItem) {
      hoveredItem.isDiscovered = true;
      hoveredItem.isExamined = true;
    }
    gameState.hoveredItemId = hoveredItem?.id ?? null;
    if (hoveredItem) _recordViewedItem(gameState, hoveredItem);
    gameState.hoveredCharacterId = hoveredItem ? null : findCharacterAtPosition(gameState, event.x, event.y)?.id ?? null;
    const hoveredExit = !hoveredItem && !gameState.hoveredCharacterId ? _findExitAtPosition(hoveredRoom, event.x, event.y, gameState) : null;
    gameState.hoveredExitKey = hoveredExit?.id ?? null;
    gameState.hoveredRoomId = !hoveredItem && !gameState.hoveredCharacterId && !hoveredExit ? hoveredRoom.id : null;
    return;
  }
  const activeCharacter = gameState.characters[gameState.activeCharacterI] || null;
  const activeRoom = activeCharacter ? findRoomAtPosition(gameState.rooms, activeCharacter.x, activeCharacter.y) : null;
  if (!activeCharacter || !activeRoom) {
    gameState.hoveredItemId = null;
    gameState.hoveredCharacterId = null;
    gameState.hoveredExitKey = null;
    gameState.hoveredRoomId = null;
    return;
  }
  const hoveredItem = findDiscoveredItemAtPosition(activeRoom, event.x, event.y, gameState.scalingFactors,
    { includeUndiscovered:true });
  if (hoveredItem) {
    hoveredItem.isDiscovered = true;
    hoveredItem.isExamined = true;
  }
  gameState.hoveredItemId = hoveredItem?.id ?? null;
  if (hoveredItem) _recordViewedItem(gameState, hoveredItem);
  gameState.hoveredCharacterId = hoveredItem ? null : findCharacterAtPosition(gameState, event.x, event.y)?.id ?? null;
  const hoveredExit = !hoveredItem && !gameState.hoveredCharacterId ? _findExitAtPosition(activeRoom, event.x, event.y, gameState) : null;
  gameState.hoveredExitKey = hoveredExit?.id ?? null;
  gameState.hoveredRoomId = _findNavigableRoomAtPosition(gameState, event.x, event.y)?.id ?? null;
}