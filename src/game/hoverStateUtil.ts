/* This module groups pointer-hit testing and hover-driven state updates for characters, items, and exit popovers. */

import { getExitHoverRect } from "./drawing/exitDrawUtil";
import { findDiscoveredItemAtPosition } from "./drawing/itemDrawUtil";
import { createCharacterSelectEffect } from "./effects/characterSelectEffectUtil";
import Character from "./types/Character";
import GameState from "./types/GameState";
import MouseDownEvent from "./types/playerEvents/MouseDownEvent";
import MouseMoveEvent from "./types/playerEvents/MouseMoveEvent";
import Rect from "./types/Rect";
import Room from "./types/Room";
import RoomExit from "./types/RoomExit";
import ScalingFactors from "./types/ScalingFactors";
import { findCharactersInRoom, findRoomAtPosition } from "./roomUtil";

function _getCharacterBoundingRect(character:Character, scalingFactors:ScalingFactors):Rect {
  const roomLineWidth = scalingFactors.roomLineWidth;
  const characterWidthPixels = roomLineWidth * 5;
  const characterHeightPixels = roomLineWidth * 10;
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
    const rect = getExitHoverRect(exit, gameState.scalingFactors, gameState.imageSet);
    const isInside = x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
    if (isInside) return exit;
  }
  return null;
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
  if (!character) return;
  const characterI = gameState.characters.indexOf(character);
  gameState.activeCharacterI = characterI;
  gameState.activeEffects.push(createCharacterSelectEffect(character, Date.now(), gameState.scalingFactors));
}

export function updateGameStateForMouseMove(gameState:GameState, event:MouseMoveEvent) {
  if (gameState.isLevelComplete) {
    const hoveredRoom = findRoomAtPosition(gameState.rooms, event.x, event.y);
    if (!hoveredRoom?.isDiscovered) {
      gameState.hoveredItemId = null;
      gameState.hoveredCharacterId = null;
      gameState.hoveredExitKey = null;
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
    return;
  }
  const activeCharacter = gameState.characters[gameState.activeCharacterI] || null;
  const activeRoom = activeCharacter ? findRoomAtPosition(gameState.rooms, activeCharacter.x, activeCharacter.y) : null;
  if (!activeCharacter || !activeRoom) {
    gameState.hoveredItemId = null;
    gameState.hoveredCharacterId = null;
    gameState.hoveredExitKey = null;
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
}