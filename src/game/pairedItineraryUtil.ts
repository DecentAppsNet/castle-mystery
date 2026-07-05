/* This module groups helpers for accessing a character's own or paired itineraries.
   If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import Character from "./types/Character";
import BecomesCharacterEvent from "./types/itineraryEvents/BecomesCharacterEvent";
import ItineraryEventType from "./types/itineraryEvents/ItineraryEventType";
import Itinerary from "./types/Itinerary";
import Room from "./types/Room";
import { assert, assertNonNullable } from "decent-portal";
import { findCharacterPoseWithoutPairHistory } from "./itineraryUtil";
import { findRoomAtPosition } from "./roomUtil";

export function hasPairedItinerary(character:Character):boolean {
  return character.pairedItinerary !== null;
}

export function getKnownItinerary(character:Character):Itinerary {
  assert(!character.isPairingKnown || character.pairedItinerary !== null,
    `pairing knowledge requires a paired itinerary for ${character.id}`);
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

function _isCharacterVisibleAtTime(character:Character, time:number):boolean {
  let isVisible = character.isVisible;
  for (const event of character.itinerary) {
    if (event.startTime > time) break;
    if (event.type !== ItineraryEventType.SHOW && event.type !== ItineraryEventType.HIDE) continue;
    isVisible = event.type === ItineraryEventType.SHOW;
  }
  return isVisible;
}

function _isReplacementWitnessable(event:BecomesCharacterEvent, allCharactersById:ReadonlyMap<string, Character>, rooms:ReadonlyArray<Room>):boolean {
  const sourceCharacter = allCharactersById.get(event.sourceCharacterId) || null;
  assertNonNullable(sourceCharacter, `missing replacement source character ${event.sourceCharacterId}`);
  if (!_isCharacterVisibleAtTime(sourceCharacter, event.startTime)) return false;
  const sourcePose = findCharacterPoseWithoutPairHistory(sourceCharacter, event.startTime);
  const sourceRoom = findRoomAtPosition(rooms, sourcePose.position.x, sourcePose.position.y) || null;
  return !!sourceRoom && !sourceRoom.isObscured;
}

function _isPairingKnown(character:Character, allCharactersById:ReadonlyMap<string, Character>, rooms:ReadonlyArray<Room>, isLevelComplete:boolean):boolean {
  if (!character.pairedItinerary) return false;
  if (isLevelComplete) return true;
  return character.pairedItinerary.some(event => event.type === ItineraryEventType.BECOMES_CHARACTER
    && _isReplacementWitnessable(event as BecomesCharacterEvent, allCharactersById, rooms));
}

export function syncPairingKnowledge(characters:Iterable<Character>, allCharactersById:ReadonlyMap<string, Character>,
  rooms:ReadonlyArray<Room>, isLevelComplete:boolean = false):void {
  for (const character of characters) {
    const nextIsPairingKnown = _isPairingKnown(character, allCharactersById, rooms, isLevelComplete);
    assert(!character.isPairingKnown || nextIsPairingKnown,
      `pairing knowledge cannot regress for ${character.id}`);
    // Pairing knowledge is durable across reveals; later syncs may add knowledge but must not revoke it.
    character.isPairingKnown = character.isPairingKnown || nextIsPairingKnown;
  }
}