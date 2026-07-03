/* This module groups helpers for accessing a character's own or paired itineraries.
   If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import Character from "./types/Character";
import BecomesCharacterEvent from "./types/itineraryEvents/BecomesCharacterEvent";
import ItineraryEventType from "./types/itineraryEvents/ItineraryEventType";
import Itinerary from "./types/Itinerary";
import { assert } from "decent-portal";

export function hasPairedItinerary(character:Character):boolean {
  return character.pairedItinerary !== null;
}

export function getKnownItinerary(character:Character):Itinerary {
  if (character.isPairingKnown && character.pairedItinerary) return character.pairedItinerary;
  return character.itinerary;
}

function _doesItineraryHaveBecomesCharacterEvent(itinerary:Itinerary):boolean {
  return itinerary.some(event => event.type === ItineraryEventType.BECOMES_CHARACTER);
}

export function findIncomingCharacterReplacementEvent(character:Character):BecomesCharacterEvent|null {
  if (!character.pairedItinerary) {
    assert(!_doesItineraryHaveBecomesCharacterEvent(character.itinerary), `A character can't have a character becomes event without .pairedItinerary being set.`);
    return null;
  }
  return character.pairedItinerary.find(event => event.type === ItineraryEventType.BECOMES_CHARACTER
    && (event as BecomesCharacterEvent).targetCharacterId === character.id) as BecomesCharacterEvent | undefined || null;
}