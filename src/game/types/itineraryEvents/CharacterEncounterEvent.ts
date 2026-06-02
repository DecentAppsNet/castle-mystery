/* This module groups the character-encounter itinerary event model and its duplication helper.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import ItineraryEventBase from "./ItineraryEventBase";

type CharacterEncounterEvent = Readonly<ItineraryEventBase & {
  encounteredCharacterIds:string[]
}>

export function duplicateCharacterEncounterEvent(from:CharacterEncounterEvent):CharacterEncounterEvent {
  return {
    type:from.type,
    startTime:from.startTime,
    duration:from.duration,
    encounteredCharacterIds:[...from.encounteredCharacterIds]
  };
}

export default CharacterEncounterEvent;
