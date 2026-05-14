import { MSECS_IN_SECOND } from "@/common/timeUtil";
import Itinerary from "@/game/types/Itinerary";
import CharacterEncounterEvent from "@/game/types/itineraryEvents/CharacterEncounterEvent";
import ItineraryEventType from "@/game/types/itineraryEvents/ItineraryEventType";
import SpeechEvent from "@/game/types/itineraryEvents/SpeechEvent";

export const SPEECH_CLUSTER_GAP_MSECS = 6 * MSECS_IN_SECOND;

export type SpeechMarkerRange = {
  startTime:number,
  endTime:number
}

export type EncounterMarker = {
  startTime:number,
  encounteredCharacterIds:string[]
}

export type ItineraryMarkerModel = {
  roomEntryTimes:number[],
  speechRanges:SpeechMarkerRange[],
  encounterMarkers:EncounterMarker[]
}

function _createSpeechRanges(itinerary:Itinerary):SpeechMarkerRange[] {
  const speechRanges = itinerary
    .filter(event => event.type === ItineraryEventType.SPEECH)
    .map(event => {
      const speechEvent = event as SpeechEvent;
      return {
        startTime:speechEvent.startTime,
        endTime:speechEvent.startTime + speechEvent.duration
      };
    })
    .sort((range1, range2) => range1.startTime - range2.startTime);

  return speechRanges.reduce<SpeechMarkerRange[]>((mergedRanges, nextRange) => {
    const previousRange = mergedRanges[mergedRanges.length - 1] || null;
    if (!previousRange) {
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

export function createItineraryMarkerModel(itinerary:Itinerary|null):ItineraryMarkerModel {
  if (!itinerary) {
    return {
      roomEntryTimes:[],
      speechRanges:[],
      encounterMarkers:[]
    };
  }

  return {
    roomEntryTimes:itinerary
      .filter(event => event.type === ItineraryEventType.ROOM_ENTRY)
      .map(event => event.startTime),
    speechRanges:_createSpeechRanges(itinerary),
    encounterMarkers:itinerary
      .filter(event => event.type === ItineraryEventType.CHARACTER_ENCOUNTER)
      .map(event => {
        const encounterEvent = event as CharacterEncounterEvent;
        return {
          startTime:encounterEvent.startTime,
          encounteredCharacterIds:[...encounterEvent.encounteredCharacterIds]
        };
      })
  };
}
