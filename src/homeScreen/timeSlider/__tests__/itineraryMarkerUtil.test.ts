import { describe, expect, it } from 'vitest';

import { createItineraryMarkerModel, SPEECH_CLUSTER_GAP_MSECS } from '../itineraryMarkerUtil';
import Itinerary from '@/game/types/Itinerary';
import Room from '@/game/types/Room';
import ItineraryEventType from '@/game/types/itineraryEvents/ItineraryEventType';

function _createRoom(id:string, isObscured:boolean):Room {
  return {
    id,
    title:id,
    rect:{ x:0, y:0, width:100, height:100 },
    items:[],
    obstructions:[],
    exits:[],
    waypoints:[],
    positionMarkersById:{},
    isDiscovered:false,
    isObscured
  };
}

describe('itineraryMarkerUtil', () => {
  describe('createItineraryMarkerModel()', () => {
    it('clusters nearby speech events and splits on larger gaps', () => {
      const itinerary:Itinerary = [
        { type:ItineraryEventType.SPEECH, startTime:0, duration:3_000, speech:'Hello', facingAngle:0 },
        { type:ItineraryEventType.SPEECH, startTime:3_000 + SPEECH_CLUSTER_GAP_MSECS, duration:2_000, speech:'Again', facingAngle:0 },
        { type:ItineraryEventType.SPEECH, startTime:3_000 + SPEECH_CLUSTER_GAP_MSECS + 2_000 + SPEECH_CLUSTER_GAP_MSECS + 1, duration:1_000, speech:'Later', facingAngle:0 }
      ];

      const markerModel = createItineraryMarkerModel(itinerary);

      expect(markerModel.speechRanges).toEqual([
        { startTime:0, endTime:3_000 + SPEECH_CLUSTER_GAP_MSECS + 2_000 },
        { startTime:3_000 + SPEECH_CLUSTER_GAP_MSECS + 2_000 + SPEECH_CLUSTER_GAP_MSECS + 1, endTime:3_000 + SPEECH_CLUSTER_GAP_MSECS + 2_000 + SPEECH_CLUSTER_GAP_MSECS + 1 + 1_000 }
      ]);
    });

    it('hides speech and encounter markers inside obscured rooms and adds obscured ranges', () => {
      const rooms = [_createRoom('Foyer', false), _createRoom('Closet', true), _createRoom('Hall', false)];
      const itinerary:Itinerary = [
        { type:ItineraryEventType.SPEECH, startTime:500, duration:400, speech:'visible', facingAngle:0 },
        { type:ItineraryEventType.ROOM_ENTRY, startTime:1_000, duration:0, roomId:'Closet' },
        { type:ItineraryEventType.SPEECH, startTime:1_200, duration:500, speech:'hidden', facingAngle:0 },
        { type:ItineraryEventType.CHARACTER_ENCOUNTER, startTime:1_300, duration:0, encounteredCharacterIds:['Bob'] },
        { type:ItineraryEventType.ROOM_ENTRY, startTime:2_000, duration:0, roomId:'Hall' },
        { type:ItineraryEventType.SPEECH, startTime:2_100, duration:400, speech:'visible again', facingAngle:0 }
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
  });
});
