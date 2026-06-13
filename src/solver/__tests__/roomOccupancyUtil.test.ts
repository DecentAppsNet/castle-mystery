// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import { createItineraryIndex } from '@/game/itineraryUtil';
import { ROOM_MIDDLE_ROW_CENTER_Z } from '@/game/roomSpaceConstants';
import Character, { createDefaultCharacter } from '@/game/types/Character';
import GameState from '@/game/types/GameState';
import Item from '@/game/types/Item';
import Itinerary from '@/game/types/Itinerary';
import Level from '@/game/types/Level';
import Room, { createDefaultRoom } from '@/game/types/Room';
import ItineraryEventType from '@/game/types/itineraryEvents/ItineraryEventType';
import { collectRoomOccupancyChangeTimes, createRoomOccupancyByRoomId } from '../roomOccupancyUtil';

function _createItem(id:string):Item {
  return { id, title:id, displayChar:id[0], imageUrl:null, randomSalt:0, position:{ x:0, y:0, z:0 }, drawOffset:{ x:0, y:0, z:0 }, description:id, isDiscovered:false };
}

function _createRoom(id:string, x:number, items:Item[] = []):Room {
  return { ...createDefaultRoom(), id, title:id, rect:{ x, y:0, width:100, height:100 }, items };
}

function _createCharacter(id:string, x:number, held:Item|null = null, itinerary:Itinerary = []):Character {
  const position = { x, y:10, z:ROOM_MIDDLE_ROW_CENTER_Z };
  return { ...createDefaultCharacter(), id, title:id, position, leftHandItem:held, itinerary, itineraryIndex:createItineraryIndex(itinerary, position) };
}

describe('roomOccupancyUtil', () => {
  describe('createRoomOccupancyByRoomId()', () => {
    it('groups characters by their room and lists each room\'s placed and held items', () => {
      const rooms = [_createRoom('a', 0, [_createItem('vase')]), _createRoom('b', 100)];
      const alice = _createCharacter('alice', 10, _createItem('knife')); // In room a, holding the knife.
      const bob = _createCharacter('bob', 50);                           // In room a, empty-handed.
      const carol = _createCharacter('carol', 150);                      // In room b.
      const gameState = { characters:[alice, bob, carol], rooms } as Pick<GameState, 'characters' | 'rooms'>;

      const occupancy = createRoomOccupancyByRoomId(gameState);

      expect(occupancy.get('a')).toEqual({ characterIds:['alice', 'bob'], itemIds:['vase', 'knife'] });
      expect(occupancy.get('b')).toEqual({ characterIds:['carol'], itemIds:[] });
    });

    it('omits a character standing outside every room, and the item they hold', () => {
      const rooms = [_createRoom('a', 0)];
      const stray = _createCharacter('stray', 500, _createItem('lantern')); // Outside any room rect.
      const gameState = { characters:[stray], rooms } as Pick<GameState, 'characters' | 'rooms'>;

      expect(createRoomOccupancyByRoomId(gameState).size).toBe(0);
    });
  });

  describe('collectRoomOccupancyChangeTimes()', () => {
    it('samples the start time plus every room-entry and item-movement tick, sorted and deduped', () => {
      const itinerary:Itinerary = [
        { type:ItineraryEventType.ROOM_ENTRY, startTime:3_000, duration:0, roomId:'b' },
        { type:ItineraryEventType.TAKE_ITEM, startTime:1_000, duration:0, itemId:'knife', destination:'left-hand' },
        { type:ItineraryEventType.DROP_ITEM, startTime:1_000, duration:0, itemId:'knife', position:{ x:0, y:0, z:0 }, drawOffset:{ x:0, y:0, z:0 } }, // Duplicate tick collapses.
      ];
      const level = { startTime:0, characters:[_createCharacter('alice', 10, null, itinerary)] } as Pick<Level, 'startTime' | 'characters'>;

      expect(collectRoomOccupancyChangeTimes(level)).toEqual([0, 1_000, 3_000]);
    });

    it('ignores event types that cannot change room occupancy', () => {
      const itinerary:Itinerary = [
        { type:ItineraryEventType.WALK, startTime:2_000, duration:1_000, fromPosition:{ x:0, y:0, z:0 }, toPosition:{ x:1, y:0, z:0 } },
      ];
      const level = { startTime:500, characters:[_createCharacter('alice', 10, null, itinerary)] } as Pick<Level, 'startTime' | 'characters'>;

      expect(collectRoomOccupancyChangeTimes(level)).toEqual([500]);
    });
  });
});
