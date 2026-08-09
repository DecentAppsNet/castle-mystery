/* This module groups active-character focus helpers that resolve the focused character across placed and unplaced runtime state.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import Character from "./types/Character";
import GameState from "./types/GameState";

function _findCharacterById(gameState:GameState, characterId:string):Character|null {
  return gameState.initialCharacters.find(character => character.id === characterId) || null;
}

export function findCharacterById(gameState:GameState, characterId:string):Character|null {
  return _findCharacterById(gameState, characterId) || null;
}

export function findActivePlacedCharacter(gameState:GameState):Character|null {
  return _findCharacterById(gameState, gameState.activeCharacterId);
}

export function findActiveCharacter(gameState:GameState):Character|null {
  return findCharacterById(gameState, gameState.activeCharacterId);
}