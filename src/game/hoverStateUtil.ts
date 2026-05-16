/* This module groups pointer-hit testing and hover-driven state updates for characters and item popovers. */

import { findDiscoveredItemAtPosition } from "./drawing/itemDrawUtil";
import { createCharacterSelectEffect } from "./effects/characterSelectEffectUtil";
import Character from "./types/Character";
import GameState from "./types/GameState";
import MouseDownEvent from "./types/playerEvents/MouseDownEvent";
import MouseMoveEvent from "./types/playerEvents/MouseMoveEvent";
import Rect from "./types/Rect";
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

export function findCharacterAtPosition(gameState:GameState, x:number, y:number):Character|null {
  if (gameState.characters.length === 0) return null;
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

export function updateGameStateForMouseMove(gameState:GameState, event:MouseMoveEvent, discoverVisibleItemsInActiveRoom:() => void) {
  const activeCharacter = gameState.characters[gameState.activeCharacterI] || null;
  const activeRoom = activeCharacter ? findRoomAtPosition(gameState.rooms, activeCharacter.x, activeCharacter.y) : null;
  if (!activeCharacter || !activeRoom) {
    gameState.hoveredItemId = null;
    gameState.hoveredCharacterId = null;
    return;
  }
  discoverVisibleItemsInActiveRoom();
  const hoveredItem = findDiscoveredItemAtPosition(activeRoom, event.x, event.y, gameState.scalingFactors);
  gameState.hoveredItemId = hoveredItem?.id ?? null;
  if (hoveredItem) gameState.viewedItemIds.add(hoveredItem.id);
  gameState.hoveredCharacterId = hoveredItem ? null : findCharacterAtPosition(gameState, event.x, event.y)?.id ?? null;
}