/* This module groups active-character focus helpers that resolve the focused character across placed and unplaced runtime state.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { assertNonNullable } from "decent-portal";
import Character from "./types/Character";
import GameState from "./types/GameState";

export function findActiveCharacter(gameState:GameState):Character {
  const characterI = gameState.timeline.characterIdToI[gameState.activeCharacterId];
  assertNonNullable(characterI);
  const character = gameState.timelineSnapshot.characters[characterI];
  assertNonNullable(character);
  return character;
}