import { describe, expect, it } from 'vitest';

import { findOpenExitConnectingRooms } from '../roomUtil';
import ExitStatus from '../types/ExitStatus';
import ExitType from '../types/ExitType';
import Room, { createDefaultRoom } from '../types/Room';
import RoomExit from '../types/RoomExit';

function _createExit(exitStatus:RoomExit['exitStatus'], id:string = 'exit-a-b'):RoomExit {
  return {
    id,
    x:10,
    y:5,
    room1Id:'room-a',
    room2Id:'room-b',
    exitType:ExitType.door,
    lockableFromRoom1With:null,
    lockableFromRoom2With:null,
    exitStatus
  };
}

function _createRoom(id:string, exits:RoomExit[] = []):Room {
  return { ...createDefaultRoom(), id, exits };
}

describe('roomUtil', () => {
  describe('findOpenExitConnectingRooms()', () => {
    it('does not connect a room to itself', () => {
      const room = _createRoom('room-a', [_createExit(ExitStatus.open)]);

      expect(findOpenExitConnectingRooms(room, room)).toBeNull();
    });

    it('returns the first open exit directly connecting the rooms', () => {
      const firstExit = _createExit(ExitStatus.open, 'first');
      const secondExit = _createExit(ExitStatus.open, 'second');
      const room = _createRoom('room-a', [firstExit, secondExit]);

      expect(findOpenExitConnectingRooms(room, _createRoom('room-b'))).toBe(firstExit);
    });

    it('ignores a closed connecting exit', () => {
      const room = _createRoom('room-a', [_createExit(ExitStatus.closed)]);

      expect(findOpenExitConnectingRooms(room, _createRoom('room-b'))).toBeNull();
    });

    it('ignores a locked connecting exit', () => {
      const room = _createRoom('room-a', [_createExit(ExitStatus.locked)]);

      expect(findOpenExitConnectingRooms(room, _createRoom('room-b'))).toBeNull();
    });

    it('ignores an open exit to a different room', () => {
      const room = _createRoom('room-a', [_createExit(ExitStatus.open)]);

      expect(findOpenExitConnectingRooms(room, _createRoom('room-c'))).toBeNull();
    });
  });
});
