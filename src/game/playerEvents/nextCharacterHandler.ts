/* This file handles cycling to the next interactive character in the active visible room.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assert } from "decent-portal";
import { isCharacterInteractive } from "../interactivityUtil";
import { isPositionInRect } from "../rectUtil";
import GameState from "../types/GameState";
import CharacterWithEffects from "../types/CharacterWithEffects";
import { findActiveVisibleRoom } from "./hoverStateUtil";
import { selectCharacter } from "./characterSelectionUtil";

export function updateGameStateForNextCharacter(gameState:GameState, snapshotCharacters:CharacterWithEffects[], metaTime:number) {
  const room = findActiveVisibleRoom(gameState);
  if (!room) return;
  const activeCharacterI = snapshotCharacters.findIndex(character => character.id === gameState.activeCharacterId);
  assert(activeCharacterI >= 0);

  for (let offset = 1; offset < snapshotCharacters.length; ++offset) {
    const character = snapshotCharacters[(activeCharacterI + offset) % snapshotCharacters.length];
    if (!isCharacterInteractive(character) || !isPositionInRect(character.position.x, character.position.y, room.rect)) continue;
    selectCharacter(gameState, snapshotCharacters, character, metaTime);
    return;
  }
}