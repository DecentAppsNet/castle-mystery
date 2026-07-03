/* This module groups helpers for accessing a character's own or paired itineraries.
   If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import Character from "./types/Character";
import Itinerary from "./types/Itinerary";

export function hasPairedItinerary(character:Character):boolean {
  return character.pairedItinerary !== null;
}

export function getPairedItineraryIfAvailable(character:Character):Itinerary|null {
  return character.pairedItinerary;
}

export function getKnownItinerary(character:Character):Itinerary {
  if (character.isPairingKnown && character.pairedItinerary) return character.pairedItinerary;
  return character.itinerary;
}