/* This module groups pose and active-focus resolution helpers used during dynamic-state rebuild, meaning the rebuild process that starts from initial runtime state and re-applies authored timeline events up to a target time.
   If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { assertNonNullable } from "decent-portal";

import { findActiveCharacter } from "../activeCharacterUtil";
import { findCharacterPose } from "../itineraryUtil";
import GameState from "../types/GameState";
import Itinerary from "../types/Itinerary";
import BecomesCharacterEvent from "../types/itineraryEvents/BecomesCharacterEvent";
import ItineraryEvent from "../types/itineraryEvents/ItineraryEvent";

  // TODO cleanup - Refactor lookup functions to replayCharacterUtil or similar. Get consistency on naming for ReplacementEvent vs BecomesEvent.

function _findBecomesEventForTime(pairedItinerary:Itinerary, time:number):BecomesCharacterEvent|null {
  for(let i = pairedItinerary.length - 1; i >= 0; --i) {
    const event = pairedItinerary[i];
    if (event.startTime > time) continue;
    if (event.type !== 'BecomesCharacter') continue;
    return event as BecomesCharacterEvent;
  }
  return null;
}

function _findFirstActiveCharacterIdInPairedItinerary(pairedItinerary:Itinerary):string {
  const event:ItineraryEvent|undefined = pairedItinerary.find(event => event.type === 'BecomesCharacter');
  assertNonNullable(event, 'A paired itinerary must contain at least one character-becomes event');
  return (event as BecomesCharacterEvent).sourceCharacterId;
}

function _findActiveCharacterIdAtTime(gameState:GameState, time:number):string {
  // If the current character isn't paired with another, then active character ID will never change.
  // If the active character is pairing-unknown, then no scrubbing/playing action could
  // ever change the active character ID, and it is correct to return the same active character ID.
  const activeCharacter = findActiveCharacter(gameState);
  assertNonNullable(activeCharacter);
  if (!activeCharacter.pairedItinerary || !activeCharacter.isPairingKnown) return activeCharacter.id;

  // But for a paired character with pairing known, I must find the most recent 
  // character-becomes event on or before the time to check for an active character
  // switch.
  const becomesEvent = _findBecomesEventForTime(activeCharacter.pairedItinerary, time);

  // If no becomes event precedes the `time` param, it's still possible that a previously
  // selected time for a rebuid has the active character being set from sometime
  // after the `time` param. So in this case, I must find the first character-becomes event in
  // the paired itinerary to learn what the first active character for the pair itinerary is.
  if (!becomesEvent) return _findFirstActiveCharacterIdInPairedItinerary(activeCharacter.pairedItinerary);

  // Otherwise, the target character of this event represents which character of the pair should be active at this time.
  return becomesEvent.targetCharacterId;
}

// Resolve placed-character poses and then normalize active focus for the target time.
export function resolveCharacterPosesAndActiveFocus(gameState:GameState, time:number) {
  gameState.characters.forEach(character => {
    const pose = findCharacterPose(character, time);
    character.position = { ...pose.position };
    character.facingDirection = pose.facingDirection;
    character.bodyOrientation = pose.bodyOrientation;
  });
  gameState.activeCharacterId = _findActiveCharacterIdAtTime(gameState, time);
}