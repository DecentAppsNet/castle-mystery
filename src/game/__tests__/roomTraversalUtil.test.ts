import { describe, expect, it } from 'vitest';

import { loadValidLevelForTest } from '@/levelLoading/__tests__/testLevelUtil';
import { findInterpolatedCharacterPosition } from '../timeline';
import { findRoomAtPosition } from '../roomUtil';
import { findCrossedRooms, findRoomCrossings } from '../roomTraversalUtil';
import { createDefaultCharacterKeyframe } from '../types/CharacterKeyframe';
import Position from '../types/Position';
import Room from '../types/Room';
import TimelineKeyframe from '../types/TimelineKeyframe';
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

function _createKeyframe(time:number, position:Position):TimelineKeyframe {
  return { time, characters:[{ ...createDefaultCharacterKeyframe(), position }], rooms:[] };
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

  describe('findRoomCrossings()', () => {
    it('returns ordered rightward intervals including the room without a keyframe', () => {
      const { rooms, west, east } = _loadRooms();

      expect(findRoomCrossings(_roomCenter(west), _roomCenter(east), 100, 2100, rooms)).toEqual([
        { roomId:'center', entryTime:600, exitTime:1600 },
        { roomId:'east', entryTime:1600, exitTime:2100 }
      ]);
    });

    it('returns ordered leftward intervals including the room without a keyframe', () => {
      const { rooms, west, east } = _loadRooms();

      expect(findRoomCrossings(_roomCenter(east), _roomCenter(west), 100, 2100, rooms)).toEqual([
        { roomId:'center', entryTime:600, exitTime:1600 },
        { roomId:'west', entryTime:1600, exitTime:2100 }
      ]);
    });

    it('bounds the last interval by an endpoint inside the intermediate room', () => {
      const { rooms, west, center } = _loadRooms();

      expect(findRoomCrossings(_roomCenter(west), _roomCenter(center), 100, 2100, rooms)).toEqual([
        { roomId:'center', entryTime:1100, exitTime:2100 }
      ]);
    });

    it('preserves fractional crossing times', () => {
      const { rooms, west, east } = _loadRooms();

      expect(findRoomCrossings(_roomCenter(west), _roomCenter(east), 100, 2101, rooms)).toEqual([
        { roomId:'center', entryTime:600.25, exitTime:1600.75 },
        { roomId:'east', entryTime:1600.75, exitTime:2101 }
      ]);
    });

    it('provides an interval whose midpoint interpolates inside the rightward transit room', () => {
      const { rooms, west, east } = _loadRooms();
      const fromPosition = _roomCenter(west);
      const toPosition = _roomCenter(east);
      const crossing = findRoomCrossings(fromPosition, toPosition, 100, 2100, rooms)[0];
      const sampleTime = (crossing.entryTime + crossing.exitTime) / 2;

      const position = findInterpolatedCharacterPosition(_createKeyframe(100, fromPosition),
        _createKeyframe(2100, toPosition), sampleTime, 0);

      expect(findRoomAtPosition(rooms, position.x, position.y)?.id).toBe('center');
    });

    it('samples inside a leftward transit room even though its entry boundary belongs to the prior room', () => {
      const { rooms, west, east } = _loadRooms();
      const fromKeyframe = _createKeyframe(100, _roomCenter(east));
      const toKeyframe = _createKeyframe(2100, _roomCenter(west));
      const crossing = findRoomCrossings(_roomCenter(east), _roomCenter(west), 100, 2100, rooms)[0];
      const entryPosition = findInterpolatedCharacterPosition(fromKeyframe, toKeyframe, crossing.entryTime, 0);
      const sampleTime = (crossing.entryTime + crossing.exitTime) / 2;

      const position = findInterpolatedCharacterPosition(fromKeyframe, toKeyframe, sampleTime, 0);

      expect(findRoomAtPosition(rooms, entryPosition.x, entryPosition.y)?.id).toBe('east');
      expect(findRoomAtPosition(rooms, position.x, position.y)?.id).toBe('center');
    });

    it('returns no crossings for horizontal movement within one room', () => {
      const { rooms, west } = _loadRooms();
      const fromPosition = _roomCenter(west);

      expect(findRoomCrossings(fromPosition, { ...fromPosition, x:fromPosition.x + 1 }, 100, 2100, rooms)).toEqual([]);
    });

    it('returns no crossings for normal in-room movement that changes Y', () => {
      const { rooms, west } = _loadRooms();
      const fromPosition = _roomCenter(west);

      expect(findRoomCrossings(fromPosition, { ...fromPosition, x:fromPosition.x + 1, y:fromPosition.y + 1 },
        100, 2100, rooms)).toEqual([]);
    });

    it('returns no crossings for normal in-room movement that changes Z', () => {
      const { rooms, west } = _loadRooms();
      const fromPosition = _roomCenter(west);

      expect(findRoomCrossings(fromPosition, { ...fromPosition, x:fromPosition.x + 1, z:1 }, 100, 2100, rooms)).toEqual([]);
    });

    it('returns no crossings for a stationary character', () => {
      const { rooms, west } = _loadRooms();
      const position = _roomCenter(west);

      expect(findRoomCrossings(position, position, 100, 2100, rooms)).toEqual([]);
    });
  });
});