import { createCharacterEncounterEvent, createItineraryIndex, findCharacterPose } from "./itineraryUtil";
import Character from "./types/Character";
import Room from "./types/Room";
import { findRoomAtPosition } from "./roomUtil";
import ItineraryEvent from "./types/itineraryEvents/ItineraryEvent";
import ItineraryEventType from "./types/itineraryEvents/ItineraryEventType";

function _compareIds(id1:string, id2:string):number {
  return id1.localeCompare(id2);
}

function _createOtherCharacterIdsInSameRoom(character:Character, characters:Character[], rooms:Room[], time:number):string[] {
  const characterPose = findCharacterPose(character, time);
  const room = findRoomAtPosition(rooms, characterPose.position.x, characterPose.position.y) || null;
  if (!room) return [];

  return characters
    .filter(otherCharacter => otherCharacter.id !== character.id)
    .filter(otherCharacter => {
      const otherPose = findCharacterPose(otherCharacter, time);
      const otherRoom = findRoomAtPosition(rooms, otherPose.position.x, otherPose.position.y) || null;
      return otherRoom?.id === room.id;
    })
    .map(otherCharacter => otherCharacter.id)
    .sort(_compareIds);
}

function _createEncounterEvents(character:Character, characters:Character[], rooms:Room[], encounterTimes:number[]):ItineraryEvent[] {
  const encounterEvents:ItineraryEvent[] = [];
  let previousOtherCharacterIds = _createOtherCharacterIdsInSameRoom(character, characters, rooms, 0);

  encounterTimes.forEach(time => {
    const currentOtherCharacterIds = _createOtherCharacterIdsInSameRoom(character, characters, rooms, time);
    const previousOtherCharacterIdSet = new Set(previousOtherCharacterIds);
    const encounteredCharacterIds = currentOtherCharacterIds.filter(otherCharacterId => !previousOtherCharacterIdSet.has(otherCharacterId));
    if (encounteredCharacterIds.length > 0) {
      encounterEvents.push(createCharacterEncounterEvent(time, encounteredCharacterIds));
    }
    previousOtherCharacterIds = currentOtherCharacterIds;
  });

  return encounterEvents;
}

function _sortItineraryEvents(event1:ItineraryEvent, event2:ItineraryEvent):number {
  return event1.startTime - event2.startTime;
}

export function addCharacterEncounterEvents(characters:Character[], rooms:Room[]):Character[] {
  const encounterTimes = [...new Set(characters
    .flatMap(character => character.itinerary)
    .filter(event => event.type === ItineraryEventType.ROOM_ENTRY)
    .map(event => event.startTime))]
    .sort((time1, time2) => time1 - time2);

  return characters.map(character => {
    const encounterEvents = _createEncounterEvents(character, characters, rooms, encounterTimes);
    if (encounterEvents.length === 0) return character;
    const itinerary = [...character.itinerary, ...encounterEvents].sort(_sortItineraryEvents);
    return {
      ...character,
      itinerary,
      itineraryIndex:createItineraryIndex(itinerary, { x:character.x, y:character.y })
    };
  });
}
