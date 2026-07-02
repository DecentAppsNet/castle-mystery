/* This module groups active-character focus helpers that resolve the focused character across placed and unplaced runtime state.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import Character from "./types/Character";
import GameState from "./types/GameState";

function _findPlacedCharacterI(gameState:GameState, characterId:string):number {
  return gameState.characters.findIndex(character => character.id === characterId);
}

export function findPlacedCharacterById(gameState:GameState, characterId:string):Character|null {
  return gameState.characters.find(character => character.id === characterId) || null;
}

export function findCharacterById(gameState:GameState, characterId:string):Character|null {
  return findPlacedCharacterById(gameState, characterId)
    || gameState.unplacedCharactersById.get(characterId)
    || null;
}

export function findActivePlacedCharacter(gameState:GameState):Character|null {
  return findPlacedCharacterById(gameState, gameState.activeCharacterId);
}

export function findActiveCharacter(gameState:GameState):Character|null {
  return findCharacterById(gameState, gameState.activeCharacterId);
}

export function syncActiveCharacterIndex(gameState:GameState) {
  gameState.activeCharacterI = _findPlacedCharacterI(gameState, gameState.activeCharacterId);
}

export function setActiveCharacterId(gameState:GameState, characterId:string) {
  gameState.activeCharacterId = characterId;
  syncActiveCharacterIndex(gameState);
}