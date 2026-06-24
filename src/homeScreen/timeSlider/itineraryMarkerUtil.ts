/* This module groups itinerary-marker derivation helpers for time-slider room, speech, and encounter markers.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { MSECS_IN_SECOND } from "@/common/timeUtil";
import { isCharacterInteractive } from "@/game/interactivityUtil";
import Character from "@/game/types/Character";
import Itinerary from "@/game/types/Itinerary";
import Room from "@/game/types/Room";
import CharacterEncounterEvent from "@/game/types/itineraryEvents/CharacterEncounterEvent";
import ItineraryEventType from "@/game/types/itineraryEvents/ItineraryEventType";
import RoomEntryEvent from "@/game/types/itineraryEvents/RoomEntryEvent";

export const SPEECH_CLUSTER_GAP_MSECS = 6 * MSECS_IN_SECOND;

type SpeechMarkerRange = {
  startTime:number,
  endTime:number
}

type EncounterMarker = {
  startTime:number,
  encounteredCharacterIds:string[]
}

type ObscuredMarkerRange = {
  startTime:number,
  endTime:number
}

export type ItineraryMarkerModel = {
  roomEntryTimes:number[],
  speechRanges:SpeechMarkerRange[],
  encounterMarkers:EncounterMarker[],
  obscuredRanges:ObscuredMarkerRange[]
}

function _isTimeInsideRange(time:number, range:ObscuredMarkerRange):boolean {
  return time >= range.startTime && time < range.endTime;
}

function _subtractObscuredRangesFromSpeechRange(range:SpeechMarkerRange, obscuredRanges:ObscuredMarkerRange[]):SpeechMarkerRange[] {
  return obscuredRanges.reduce<SpeechMarkerRange[]>((remainingRanges, obscuredRange) => {
    return remainingRanges.flatMap(remainingRange => {
      if (obscuredRange.endTime <= remainingRange.startTime || obscuredRange.startTime >= remainingRange.endTime) {
        return [remainingRange];
      }

      const nextRanges:SpeechMarkerRange[] = [];
      if (obscuredRange.startTime > remainingRange.startTime) {
        nextRanges.push({ startTime:remainingRange.startTime, endTime:Math.min(obscuredRange.startTime, remainingRange.endTime) });
      }
      if (obscuredRange.endTime < remainingRange.endTime) {
        nextRanges.push({ startTime:Math.max(obscuredRange.endTime, remainingRange.startTime), endTime:remainingRange.endTime });
      }
      return nextRanges;
    });
  }, [range]).filter(remainingRange => remainingRange.endTime > remainingRange.startTime);
}

function _createObscuredRanges(itinerary:Itinerary, rooms:Room[], initialRoomId:string|null, durationMsecs:number):ObscuredMarkerRange[] {
  const roomById = new Map(rooms.map(room => [room.id, room]));
  const roomEntryEvents = itinerary
    .filter(event => event.type === ItineraryEventType.ROOM_ENTRY)
    .map(event => event as RoomEntryEvent)
    .sort((event1, event2) => event1.startTime - event2.startTime);
  const obscuredRanges:ObscuredMarkerRange[] = [];
  let currentRoomId = initialRoomId;
  let obscuredStartTime = currentRoomId && roomById.get(currentRoomId)?.isObscured ? 0 : null;

  roomEntryEvents.forEach(roomEntryEvent => {
    if (obscuredStartTime !== null) {
      obscuredRanges.push({ startTime:obscuredStartTime, endTime:roomEntryEvent.startTime });
    }
    currentRoomId = roomEntryEvent.roomId;
    obscuredStartTime = roomById.get(currentRoomId)?.isObscured ? roomEntryEvent.startTime : null;
  });

  if (obscuredStartTime !== null && durationMsecs > obscuredStartTime) {
    obscuredRanges.push({ startTime:obscuredStartTime, endTime:durationMsecs });
  }

  return obscuredRanges.filter(range => range.endTime > range.startTime);
}

function _createSpeechRanges(itinerary:Itinerary):SpeechMarkerRange[] {
  return itinerary
    .filter(event => event.type === ItineraryEventType.SPEECH || event.type === ItineraryEventType.THOUGHT)
    .map(event => {
      return {
        startTime:event.startTime,
        endTime:event.startTime + event.duration
      };
    })
    .sort((range1, range2) => range1.startTime - range2.startTime);
}

function _hasObscuredRangeBetween(range1:SpeechMarkerRange, range2:SpeechMarkerRange, obscuredRanges:ObscuredMarkerRange[]):boolean {
  return obscuredRanges.some(obscuredRange => obscuredRange.startTime >= range1.endTime && obscuredRange.endTime <= range2.startTime);
}

function _mergeSpeechRanges(speechRanges:SpeechMarkerRange[], obscuredRanges:ObscuredMarkerRange[] = []):SpeechMarkerRange[] {
  const sortedSpeechRanges = [...speechRanges].sort((range1, range2) => range1.startTime - range2.startTime);

  return sortedSpeechRanges.reduce<SpeechMarkerRange[]>((mergedRanges, nextRange) => {
    const previousRange = mergedRanges[mergedRanges.length - 1] || null;
    if (!previousRange) {
      mergedRanges.push(nextRange);
      return mergedRanges;
    }
    if (_hasObscuredRangeBetween(previousRange, nextRange, obscuredRanges)) {
      mergedRanges.push(nextRange);
      return mergedRanges;
    }
    if (nextRange.startTime - previousRange.endTime <= SPEECH_CLUSTER_GAP_MSECS) {
      previousRange.endTime = Math.max(previousRange.endTime, nextRange.endTime);
      return mergedRanges;
    }
    mergedRanges.push(nextRange);
    return mergedRanges;
  }, []);
}

export function createItineraryMarkerModel(itinerary:Itinerary|null, rooms:Room[] = [], initialRoomId:string|null = null,
  durationMsecs:number = 0, characters:Pick<Character, 'id' | 'description'>[] = []):ItineraryMarkerModel {
  if (!itinerary) {
    return {
      roomEntryTimes:[],
      speechRanges:[],
      encounterMarkers:[],
      obscuredRanges:[]
    };
  }

  const interactiveCharacterIds = new Set(characters.filter(isCharacterInteractive).map(character => character.id));
  const obscuredRanges = _createObscuredRanges(itinerary, rooms, initialRoomId, durationMsecs);
  const visibleSpeechRanges = _mergeSpeechRanges(_createSpeechRanges(itinerary)
    .flatMap(range => _subtractObscuredRangesFromSpeechRange(range, obscuredRanges)), obscuredRanges);
  const visibleEncounterMarkers = itinerary
    .filter(event => event.type === ItineraryEventType.CHARACTER_ENCOUNTER)
    .map(event => {
      const encounterEvent = event as CharacterEncounterEvent;
      return {
        startTime:encounterEvent.startTime,
        encounteredCharacterIds:encounterEvent.encounteredCharacterIds.filter(characterId => interactiveCharacterIds.has(characterId))
      };
    })
    .filter(marker => marker.encounteredCharacterIds.length > 0)
    .filter(marker => !obscuredRanges.some(range => _isTimeInsideRange(marker.startTime, range)));

  return {
    roomEntryTimes:itinerary
      .filter(event => event.type === ItineraryEventType.ROOM_ENTRY)
      .map(event => event.startTime),
    speechRanges:visibleSpeechRanges,
    encounterMarkers:visibleEncounterMarkers,
    obscuredRanges
  };
}
