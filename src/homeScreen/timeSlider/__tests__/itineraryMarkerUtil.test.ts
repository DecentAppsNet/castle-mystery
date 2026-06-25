// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import { createItineraryMarkerModel, SPEECH_CLUSTER_GAP_MSECS } from '../itineraryMarkerUtil';
import Itinerary from '@/game/types/Itinerary';
import Room, { createDefaultRoom } from '@/game/types/Room';
import ItineraryEventType from '@/game/types/itineraryEvents/ItineraryEventType';

function _createRoom(id:string, isObscured:boolean):Room {
  return {
    ...createDefaultRoom(),
    id,
    title:id,
    rect:{ x:0, y:0, width:100, height:100 },
    isDiscovered:false,
    isObscured
  };
}

describe('itineraryMarkerUtil', () => {
  describe('createItineraryMarkerModel()', () => {
    it('clusters nearby speech events and splits on larger gaps', () => {
      const itinerary:Itinerary = [
        { type:ItineraryEventType.SPEECH, startTime:0, duration:3_000, speech:'Hello' },
        { type:ItineraryEventType.SPEECH, startTime:3_000 + SPEECH_CLUSTER_GAP_MSECS, duration:2_000, speech:'Again' },
        { type:ItineraryEventType.SPEECH, startTime:3_000 + SPEECH_CLUSTER_GAP_MSECS + 2_000 + SPEECH_CLUSTER_GAP_MSECS + 1, duration:1_000, speech:'Later' }
      ];

      const markerModel = createItineraryMarkerModel(itinerary);

      expect(markerModel.speechRanges).toEqual([
        { startTime:0, endTime:3_000 + SPEECH_CLUSTER_GAP_MSECS + 2_000 },
        { startTime:3_000 + SPEECH_CLUSTER_GAP_MSECS + 2_000 + SPEECH_CLUSTER_GAP_MSECS + 1, endTime:3_000 + SPEECH_CLUSTER_GAP_MSECS + 2_000 + SPEECH_CLUSTER_GAP_MSECS + 1 + 1_000 }
      ]);
    });

    it('clusters nearby speech and thought events into the same yellow range', () => {
      const itinerary:Itinerary = [
        { type:ItineraryEventType.SPEECH, startTime:0, duration:3_000, speech:'You can trust me!' },
        { type:ItineraryEventType.THOUGHT, startTime:3_000 + SPEECH_CLUSTER_GAP_MSECS, duration:2_000, thought:'You absolutely should not trust me.' },
        { type:ItineraryEventType.SPEECH, startTime:3_000 + SPEECH_CLUSTER_GAP_MSECS + 2_000 + SPEECH_CLUSTER_GAP_MSECS, duration:1_500, speech:'I will watch over your cookies.' }
      ];

      const markerModel = createItineraryMarkerModel(itinerary);

      expect(markerModel.speechRanges).toEqual([
        { startTime:0, endTime:3_000 + SPEECH_CLUSTER_GAP_MSECS + 2_000 + SPEECH_CLUSTER_GAP_MSECS + 1_500 }
      ]);
    });

    it('hides speech and encounter markers inside obscured rooms and adds obscured ranges', () => {
      const rooms = [_createRoom('Foyer', false), _createRoom('Closet', true), _createRoom('Hall', false)];
      const itinerary:Itinerary = [
        { type:ItineraryEventType.SPEECH, startTime:500, duration:400, speech:'visible' },
        { type:ItineraryEventType.ROOM_ENTRY, startTime:1_000, duration:0, roomId:'Closet' },
        { type:ItineraryEventType.SPEECH, startTime:1_200, duration:500, speech:'hidden' },
        { type:ItineraryEventType.CHARACTER_ENCOUNTER, startTime:1_300, duration:0, encounteredCharacterIds:['Bob'] },
        { type:ItineraryEventType.ROOM_ENTRY, startTime:2_000, duration:0, roomId:'Hall' },
        { type:ItineraryEventType.SPEECH, startTime:2_100, duration:400, speech:'visible again' }
      ];

      const markerModel = createItineraryMarkerModel(itinerary, rooms, 'Foyer', 3_000);

      expect(markerModel.obscuredRanges).toEqual([
        { startTime:1_000, endTime:2_000 }
      ]);
      expect(markerModel.speechRanges).toEqual([
        { startTime:500, endTime:900 },
        { startTime:2_100, endTime:2_500 }
      ]);
      expect(markerModel.encounterMarkers).toEqual([]);
    });

    it('hides thought events inside obscured rooms from the shared yellow ranges', () => {
      const rooms = [_createRoom('Foyer', false), _createRoom('Closet', true), _createRoom('Hall', false)];
      const itinerary:Itinerary = [
        { type:ItineraryEventType.SPEECH, startTime:500, duration:400, speech:'visible' },
        { type:ItineraryEventType.ROOM_ENTRY, startTime:1_000, duration:0, roomId:'Closet' },
        { type:ItineraryEventType.THOUGHT, startTime:1_200, duration:500, thought:'hidden thought' },
        { type:ItineraryEventType.ROOM_ENTRY, startTime:2_000, duration:0, roomId:'Hall' },
        { type:ItineraryEventType.THOUGHT, startTime:2_100, duration:400, thought:'visible again' }
      ];

      const markerModel = createItineraryMarkerModel(itinerary, rooms, 'Foyer', 3_000);

      expect(markerModel.speechRanges).toEqual([
        { startTime:500, endTime:900 },
        { startTime:2_100, endTime:2_500 }
      ]);
    });

    it('filters encounter markers down to interactive encountered characters', () => {
      const itinerary:Itinerary = [
        { type:ItineraryEventType.CHARACTER_ENCOUNTER, startTime:1_000, duration:0, encounteredCharacterIds:['guide', 'statue'] },
        { type:ItineraryEventType.CHARACTER_ENCOUNTER, startTime:2_000, duration:0, encounteredCharacterIds:['statue'] }
      ];

      const markerModel = createItineraryMarkerModel(itinerary, [], null, 3_000, [
        { id:'guide', description:'Helpful and talkative.' },
        { id:'statue', description:'' }
      ]);

      expect(markerModel.encounterMarkers).toEqual([
        { startTime:1_000, encounteredCharacterIds:['guide'] }
      ]);
    });
  });
});
