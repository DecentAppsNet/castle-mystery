/* This module groups helpers for accessing a character's own or paired itineraries.
   If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import Character from "./types/Character";

export function hasPairedItinerary(character:Character):boolean {
  return character.pairedItinerary !== null;
}

import Itinerary from "./types/Itinerary";

export function getKnownItinerary(character:Character):Itinerary {
  if (character.isPairingKnown && character.pairedItinerary) return character.pairedItinerary;
  return character.itinerary;
}