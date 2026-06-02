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
