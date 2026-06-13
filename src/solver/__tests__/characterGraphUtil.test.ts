// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import { buildCharacterGraph } from '../characterGraphUtil';
import { createItineraryIndex } from '@/game/itineraryUtil';
import { ROOM_BACK_Z, ROOM_MIDDLE_ROW_CENTER_Z } from '@/game/roomSpaceConstants';
import Character, { createDefaultCharacter } from '@/game/types/Character';
import Itinerary from '@/game/types/Itinerary';
import Room, { createDefaultRoom } from '@/game/types/Room';
import ItineraryEventType from '@/game/types/itineraryEvents/ItineraryEventType';

const BACK_ROW_Z = ROOM_BACK_Z;
const DEFAULT_CHARACTER_DEPTH = ROOM_MIDDLE_ROW_CENTER_Z;

function _createRoom(id:string, x:number):Room {
  return { ...createDefaultRoom(), id, title:id, rect:{ x, y:0, width:100, height:100 } };
}

function _createCharacter(id:string, x:number, y:number, itinerary:Itinerary = []):Character {
  const position = { x, y, z:DEFAULT_CHARACTER_DEPTH };
  return {
    ...createDefaultCharacter(),
    id,
    title:id,
    description:id,
    position,
    itinerary,
    itineraryIndex:createItineraryIndex(itinerary, position)
  };
}

describe('characterGraphUtil', () => {
  describe('buildCharacterGraph()', () => {
    it('links characters who share a room from the start (the case encounter events miss)', () => {
      const rooms = [_createRoom('a', 0), _createRoom('b', 100)];
      const alice = _createCharacter('alice', 10, 10);
      const bob = _createCharacter('bob', 50, 10);

      const graph = buildCharacterGraph([alice, bob], rooms, 0, 'alice');

      expect(graph.directed).toBe(false);
      expect(graph.nodes.map(node => node.id)).toEqual(['alice', 'bob']);
      expect(graph.edges).toEqual([
        { sourceId:'alice', targetId:'bob', directed:false, coPresences:[{ time:0, roomId:'a' }] }
      ]);
    });

    it('creates no edge when characters never share a room', () => {
      const rooms = [_createRoom('a', 0), _createRoom('b', 100)];
      const alice = _createCharacter('alice', 10, 10);
      const bob = _createCharacter('bob', 150, 10);

      const graph = buildCharacterGraph([alice, bob], rooms, 0, 'alice');

      expect(graph.edges).toEqual([]);
    });

    it('records one co-presence per sample time the pair shares a room', () => {
      const rooms = [_createRoom('a', 0), _createRoom('b', 100)];
      const itinerary:Itinerary = [
        { type:ItineraryEventType.WALK, startTime:0, duration:1_000, fromPosition:{ x:10, y:10, z:BACK_ROW_Z }, toPosition:{ x:150, y:10, z:BACK_ROW_Z } },
        { type:ItineraryEventType.ROOM_ENTRY, startTime:1_000, duration:0, roomId:'b' }
      ];
      const alice = _createCharacter('alice', 10, 10, itinerary);
      const bob = _createCharacter('bob', 10, 10, itinerary);

      const graph = buildCharacterGraph([alice, bob], rooms, 0, 'alice');

      expect(graph.edges).toEqual([
        { sourceId:'alice', targetId:'bob', directed:false, coPresences:[{ time:0, roomId:'a' }, { time:1_000, roomId:'b' }] }
      ]);
    });

    it('marks the active character as the start node', () => {
      const rooms = [_createRoom('a', 0)];
      const graph = buildCharacterGraph([_createCharacter('alice', 10, 10), _createCharacter('bob', 50, 10)], rooms, 0, 'bob');

      expect(graph.nodes.find(node => node.id === 'bob')?.isActiveStart).toBe(true);
      expect(graph.nodes.find(node => node.id === 'alice')?.isActiveStart).toBe(false);
    });
  });
});
