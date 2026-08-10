/* This module groups active-character focus helpers that resolve the focused character across placed and unplaced runtime state.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import Character from "./types/Character";
import GameState from "./types/GameState";

export function findActiveCharacter(gameState:GameState):Character|null {
  return gameState.baseCharacters.find(character => character.id === gameState.activeCharacterId) || null;
}