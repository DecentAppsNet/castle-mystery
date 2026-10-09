/* This file handles pointer selection of interactive characters.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import Character from "../types/Character";
import GameState from "../types/GameState";
import MouseDownEvent from "./types/MouseDownEvent";
import Position from "../types/Position";
import CharacterWithEffects from "../types/CharacterWithEffects";
import { findActiveVisibleRoom, findVisibleHoveredRoom, findHoveredRoomContent } from "./hoverStateUtil";
import { selectCharacter } from "./characterSelectionUtil";

function _findInteractiveCharacterContentAtPosition(gameState:GameState, characters:CharacterWithEffects[], x:number, y:number):
  { type:'character', character:Character, displayPosition:Position }|null {
  const interactionRoom = gameState.isLevelComplete
    ? findVisibleHoveredRoom(gameState, x, y)
    : findActiveVisibleRoom(gameState);
  if (!interactionRoom && !gameState.isLevelComplete) {
    if (gameState.discoveryState.obscuredRoomIds.has(gameState.timelineSnapshot.activeRoom.id)) return null;
  }
  const hoveredContent = interactionRoom ? findHoveredRoomContent(gameState, interactionRoom, characters, x, y) : null;
  return hoveredContent?.type === 'character' ? hoveredContent : null;
}

export function updateGameStateForMouseDown(gameState:GameState, snapshotCharacters:CharacterWithEffects[], event:MouseDownEvent, metaTime:number) {
  const characterContent = _findInteractiveCharacterContentAtPosition(gameState, snapshotCharacters, event.x, event.y);
  if (characterContent) selectCharacter(gameState, snapshotCharacters, characterContent.character, metaTime);
}