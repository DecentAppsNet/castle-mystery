import { describe, expect, it } from 'vitest';

import { createItineraryMarkerModel, SPEECH_CLUSTER_GAP_MSECS } from '../itineraryMarkerUtil';
import Itinerary from '@/game/types/Itinerary';
import ItineraryEventType from '@/game/types/itineraryEvents/ItineraryEventType';

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
  });
});
