import { describe, expect, it } from 'vitest';

import { loadValidLevelForTest } from '@/levelLoading/__tests__/testLevelUtil';
import { findCrossedRooms } from '../roomTraversalUtil';
import Position from '../types/Position';
import Room from '../types/Room';
import roomTraversalText from './fixtures/room-traversal.md?raw';

function _loadRooms() {
  const rooms = loadValidLevelForTest(roomTraversalText, 'room-traversal.md').rooms;
  return {
    rooms,
    west:rooms.find(room => room.id === 'west')!,
    center:rooms.find(room => room.id === 'center')!,
    east:rooms.find(room => room.id === 'east')!
  };
}

function _roomCenter(room:Room):Position {
  return { x:room.rect.x + room.rect.width / 2, y:room.rect.y + room.rect.height / 2, z:0 };
}

describe('roomTraversalUtil', () => {
  describe('findCrossedRooms()', () => {
    it('returns no crossed rooms for movement within the starting room', () => {
      const { rooms, west } = _loadRooms();
      const fromPosition = _roomCenter(west);

      expect(findCrossedRooms(fromPosition, { ...fromPosition, x:fromPosition.x + 1 }, rooms, west)).toEqual([]);
    });

    it('enumerates rightward travel across three rooms in travel order', () => {
      const { rooms, west, center, east } = _loadRooms();

      expect(findCrossedRooms(_roomCenter(west), _roomCenter(east), rooms, west)).toEqual([center, east]);
    });

    it('enumerates leftward travel across three rooms in travel order', () => {
      const { rooms, west, center, east } = _loadRooms();

      expect(findCrossedRooms(_roomCenter(east), _roomCenter(west), rooms, east)).toEqual([center, west]);
    });

    it('stops inside the intermediate room when traveling right', () => {
      const { rooms, west, center } = _loadRooms();

      expect(findCrossedRooms(_roomCenter(west), _roomCenter(center), rooms, west)).toEqual([center]);
    });

    it('stops inside the intermediate room when traveling left', () => {
      const { rooms, center, east } = _loadRooms();

      expect(findCrossedRooms(_roomCenter(east), _roomCenter(center), rooms, east)).toEqual([center]);
    });

    it('includes a room reached exactly at its left boundary while traveling right', () => {
      const { rooms, west, center, east } = _loadRooms();
      const toPosition = { ..._roomCenter(east), x:east.rect.x };

      expect(findCrossedRooms(_roomCenter(west), toPosition, rooms, west)).toEqual([center, east]);
    });

    it('does not enter the room left of an exact boundary endpoint while traveling left', () => {
      const { rooms, center, east } = _loadRooms();
      const toPosition = { ..._roomCenter(center), x:center.rect.x };

      expect(findCrossedRooms(_roomCenter(east), toPosition, rooms, east)).toEqual([center]);
    });
  });
});