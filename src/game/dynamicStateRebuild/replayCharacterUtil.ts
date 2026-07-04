/* This module groups shared helpers for deciding which characters and itinerary events participate in dynamic-state replay, meaning the rebuild process that starts from initial runtime state and re-applies authored timeline events up to a target time.
   If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import Character from "../types/Character";
import GameState from "../types/GameState";
import BecomesCharacterEvent from "../types/itineraryEvents/BecomesCharacterEvent";
import { findIncomingCharacterReplacementEvent } from "../pairedItineraryUtil";

// Return every character whose itinerary may contribute replayed runtime events.
export function findReplayCharacters(gameState:GameState):Character[] {
  return [...gameState.characters, ...gameState.unplacedCharactersById.values()];
}

// Find when an initially unplaced character first becomes placed in the paired itinerary.
function _findCharacterReplacementStartTime(character:Character):number|null {
  const replacementEvent = findIncomingCharacterReplacementEvent(character);
  return replacementEvent?.startTime ?? null;
}

// Find the replacement event that brings this character into placed runtime state.
export function findCharacterReplacementEvent(character:Character):BecomesCharacterEvent|null {
  return findIncomingCharacterReplacementEvent(character);
}

// Gate replay so an initially unplaced character only contributes events after its incoming replacement.
export function isReplayEventActiveForCharacter(gameState:GameState, character:Character, eventStartTime:number):boolean {
  if (!gameState.initialUnplacedCharactersById.has(character.id)) return true;
  const replacementStartTime = _findCharacterReplacementStartTime(character);
  if (replacementStartTime === null) return true;
  return eventStartTime >= replacementStartTime;
}