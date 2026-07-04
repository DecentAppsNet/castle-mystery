/* This module groups visibility replay helpers used during dynamic-state rebuild, meaning the rebuild process that starts from initial runtime state and re-applies authored timeline events up to a target time.
   If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { assertNonNullable } from "decent-portal";

import GameState from "../types/GameState";
import ItineraryEventType from "../types/itineraryEvents/ItineraryEventType";
import VisibilityEvent from "../types/itineraryEvents/VisibilityEvent";
import { findReplayCharacters, isReplayEventActiveForCharacter } from "./replayCharacterUtil";

type AppliedVisibilityEvent = {
  characterId:string,
  eventIndex:number,
  event:VisibilityEvent
}

// Gather and sort show and hide events that should already have happened by the target time.
function _collectAppliedVisibilityEvents(gameState:GameState, time:number):AppliedVisibilityEvent[] {
  const appliedEvents:AppliedVisibilityEvent[] = [];
  findReplayCharacters(gameState).forEach(character => {
    character.itinerary.forEach((event, eventIndex) => {
      if (event.startTime > time) return;
      if (!isReplayEventActiveForCharacter(gameState, character, event.startTime)) return;
      switch(event.type) {
        case ItineraryEventType.SHOW:
        case ItineraryEventType.HIDE:
          appliedEvents.push({
            characterId:character.id,
            eventIndex,
            event:event as VisibilityEvent
          });
        break;
      }
    });
  });
  appliedEvents.sort((a, b) => a.event.startTime - b.event.startTime || a.characterId.localeCompare(b.characterId) || a.eventIndex - b.eventIndex);
  return appliedEvents;
}

// Apply a show or hide event to whichever runtime entity it targets.
function _applyVisibility(gameState:GameState, targetId:string, isVisible:boolean) {
  const character = gameState.characters.find(candidate => candidate.id === targetId) || null;
  if (character) {
    character.isVisible = isVisible;
    return;
  }

  const item = gameState.itemsById.get(targetId) || null;
  assertNonNullable(item, `visibility event target ${targetId} was not found`);
  item.isVisible = isVisible;
}

// Replay show and hide events into the mutable runtime state for the target time.
export function applyVisibilityState(gameState:GameState, time:number) { // TODO - I believe this can be optimized and simplified using a reverse-search for just the last event of each character.
  _collectAppliedVisibilityEvents(gameState, time).forEach(({ event }) => {
    switch(event.type) {
      case ItineraryEventType.SHOW:
        _applyVisibility(gameState, event.targetId, true);
      break;

      case ItineraryEventType.HIDE:
        _applyVisibility(gameState, event.targetId, false);
      break;
    }
  });
}