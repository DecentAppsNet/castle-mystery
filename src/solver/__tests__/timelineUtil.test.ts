// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import Character, { createDefaultCharacter } from '@/game/types/Character';
import Itinerary from '@/game/types/Itinerary';
import ItineraryEventType from '@/game/types/itineraryEvents/ItineraryEventType';
import { findTimelineEndTime } from '../timelineUtil';

const POSITION = { x:0, y:0, z:0 };

function _character(id:string, itinerary:Itinerary):Character {
  return { ...createDefaultCharacter(), id, title:id, itinerary };
}

describe('timelineUtil', () => {
  describe('findTimelineEndTime()', () => {
    it('returns the start time when no character has an itinerary', () => {
      expect(findTimelineEndTime([_character('alice', []), _character('bob', [])], 500)).toBe(500);
    });

    it('returns the latest event completion (startTime + duration) across all characters', () => {
      const alice = _character('alice', [
        { type:ItineraryEventType.WALK, startTime:0, duration:1_000, fromPosition:POSITION, toPosition:POSITION },
        { type:ItineraryEventType.ROOM_ENTRY, startTime:1_000, duration:0, roomId:'b' }
      ]);
      const bob = _character('bob', [{ type:ItineraryEventType.SPEECH, startTime:2_000, duration:1_500, speech:'hi' }]);

      expect(findTimelineEndTime([alice, bob], 0)).toBe(3_500); // Bob's speech ends last.
    });

    it('never returns earlier than the start time', () => {
      const alice = _character('alice', [{ type:ItineraryEventType.SPEECH, startTime:0, duration:100, speech:'hi' }]);
      expect(findTimelineEndTime([alice], 10_000)).toBe(10_000);
    });
  });
});
