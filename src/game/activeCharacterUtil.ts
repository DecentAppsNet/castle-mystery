/* This module groups active-character focus helpers that resolve the focused character across placed and unplaced runtime state.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import Character from "./types/Character";
import GameState from "./types/GameState";

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