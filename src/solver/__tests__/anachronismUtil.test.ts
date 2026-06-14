// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import Character, { createDefaultCharacter } from '@/game/types/Character';
import Itinerary from '@/game/types/Itinerary';
import ItineraryEvent from '@/game/types/itineraryEvents/ItineraryEvent';
import ItineraryEventType from '@/game/types/itineraryEvents/ItineraryEventType';
import { findTimelineAnachronisms } from '../anachronismUtil';

const POSITION = { x:0, y:0, z:0 };

function _walk(startTime:number, duration:number):ItineraryEvent {
  return { type:ItineraryEventType.WALK, startTime, duration, fromPosition:POSITION, toPosition:POSITION };
}

function _speech(startTime:number, duration:number):ItineraryEvent {
  return { type:ItineraryEventType.SPEECH, startTime, duration, speech:'hello' };
}

function _thought(startTime:number, duration:number):ItineraryEvent {
  return { type:ItineraryEventType.THOUGHT, startTime, duration, thought:'hmm' };
}

function _roomEntry(startTime:number):ItineraryEvent {
  return { type:ItineraryEventType.ROOM_ENTRY, startTime, duration:0, roomId:'parlour' };
}

function _take(startTime:number, duration:number):ItineraryEvent {
  return { type:ItineraryEventType.TAKE_ITEM, startTime, duration, itemId:'knife', destination:'left-hand' };
}

function _drop(startTime:number, duration:number):ItineraryEvent {
  return { type:ItineraryEventType.DROP_ITEM, startTime, duration, itemId:'knife', position:POSITION, drawOffset:POSITION };
}

function _character(id:string, itinerary:Itinerary):Character {
  return { ...createDefaultCharacter(), id, title:id.toUpperCase(), itinerary };
}

describe('anachronismUtil', () => {
  describe('findTimelineAnachronisms()', () => {
    it('returns nothing for serialized, non-overlapping movement', () => {
      const character = _character('alice', [_walk(0, 1_000), _speech(1_000, 2_000), _walk(3_000, 500)]);
      expect(findTimelineAnachronisms([character])).toEqual([]);
    });

    it('allows speaking while walking — speech and movement are independent channels', () => {
      const character = _character('bard', [_walk(0, 3_000), _speech(500, 1_000), _speech(1_800, 1_000)]);
      expect(findTimelineAnachronisms([character])).toEqual([]);
    });

    it('flags two overlapping walks — an arrival back-planned before the previous one completes', () => {
      const character = _character('steward', [_walk(1_000, 2_000), _walk(2_000, 800)]);

      const anachronisms = findTimelineAnachronisms([character]);

      expect(anachronisms).toEqual([{
        characterId:'steward',
        characterTitle:'STEWARD',
        occupying:{ type:ItineraryEventType.WALK, startTime:1_000, endTime:3_000 },
        conflicting:{ type:ItineraryEventType.WALK, startTime:2_000, endTime:2_800 },
        overlapMsecs:800
      }]);
    });

    it('flags overlapping hand actions (take while still dropping)', () => {
      const character = _character('thief', [_drop(0, 1_000), _take(500, 1_000)]);

      const anachronisms = findTimelineAnachronisms([character]);

      expect(anachronisms).toHaveLength(1);
      expect(anachronisms[0].occupying.type).toBe(ItineraryEventType.DROP_ITEM);
      expect(anachronisms[0].conflicting.type).toBe(ItineraryEventType.TAKE_ITEM);
    });

    it('ignores zero-duration markers and silent thoughts inside a movement span', () => {
      const character = _character('queen', [_walk(1_000, 2_000), _thought(1_500, 500), _roomEntry(1_800)]);
      expect(findTimelineAnachronisms([character])).toEqual([]);
    });

    it('keeps the furthest-reaching activity in progress, so it catches every overlap inside a long one', () => {
      const character = _character('king', [_walk(0, 5_000), _walk(1_000, 500), _walk(2_000, 500)]);

      const anachronisms = findTimelineAnachronisms([character]);

      expect(anachronisms.map(anachronism => anachronism.conflicting.startTime)).toEqual([1_000, 2_000]);
      expect(anachronisms.every(anachronism => anachronism.occupying.startTime === 0)).toBe(true);
    });

    it('reports anachronisms across multiple characters', () => {
      const alice = _character('alice', [_walk(0, 1_000), _walk(500, 1_000)]);
      const bob = _character('bob', [_walk(0, 1_000)]); // Clean.
      const carol = _character('carol', [_walk(0, 2_000), _walk(1_000, 100)]);

      const ids = findTimelineAnachronisms([alice, bob, carol]).map(anachronism => anachronism.characterId);

      expect(ids).toEqual(['alice', 'carol']);
    });

    it('returns nothing for a character with no itinerary', () => {
      expect(findTimelineAnachronisms([_character('mute', [])])).toEqual([]);
    });
  });
});
