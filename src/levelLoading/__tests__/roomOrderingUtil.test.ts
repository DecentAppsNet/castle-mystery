import { describe, expect, it } from 'vitest';

import Room from '@/game/types/Room';
import Rect from '@/game/types/Rect';
import { areRoomsWellOrdered, sortRoomsForDrawingOrder } from '../roomOrderingUtil';

function _createRoom(id:string, rect:Rect):Room {
  return {
    id,
    title:id,
    rect,
    isOutside:false,
    isObscured:false,
    items:[],
    exits:[],
    stairParts:[],
    waypoints:[],
    isDiscovered:false
  };
}

describe('roomOrderingUtil', () => {
  describe('areRoomsWellOrdered()', () => {
    it('returns false when a room to the right appears later in the list', () => {
      const rooms = [
        _createRoom('left', { x:0, y:0, width:20, height:20 }),
        _createRoom('right', { x:20, y:0, width:20, height:20 })
      ];

      expect(areRoomsWellOrdered(rooms)).toBe(false);
    });

    it('returns false when a room below appears later in the list', () => {
      const rooms = [
        _createRoom('top', { x:0, y:0, width:20, height:20 }),
        _createRoom('bottom', { x:0, y:20, width:20, height:20 })
      ];

      expect(areRoomsWellOrdered(rooms)).toBe(false);
    });

    it('returns true when right and lower adjacent rooms appear earlier', () => {
      const rooms = [
        _createRoom('right', { x:20, y:0, width:20, height:20 }),
        _createRoom('bottom', { x:0, y:20, width:20, height:20 }),
        _createRoom('topLeft', { x:0, y:0, width:20, height:20 })
      ];

      expect(areRoomsWellOrdered(rooms)).toBe(true);
    });
  });

  describe('sortRoomsForDrawingOrder()', () => {
    it('moves a room after adjacent rooms to its right and below', () => {
      const rooms = [
        _createRoom('topLeft', { x:0, y:0, width:20, height:20 }),
        _createRoom('right', { x:20, y:0, width:20, height:20 }),
        _createRoom('bottom', { x:0, y:20, width:20, height:20 })
      ];

      const sortedRooms = sortRoomsForDrawingOrder(rooms);

      expect(sortedRooms.map(room => room.id)).toEqual(['right', 'bottom', 'topLeft']);
      expect(areRoomsWellOrdered(sortedRooms)).toBe(true);
    });

    it('keeps the initial x-descending y-ascending order for non-adjacent rooms', () => {
      const rooms = [
        _createRoom('left', { x:0, y:20, width:20, height:20 }),
        _createRoom('rightLow', { x:40, y:40, width:20, height:20 }),
        _createRoom('rightHigh', { x:40, y:0, width:20, height:20 })
      ];

      const sortedRooms = sortRoomsForDrawingOrder(rooms);

      expect(sortedRooms.map(room => room.id)).toEqual(['rightHigh', 'rightLow', 'left']);
      expect(areRoomsWellOrdered(sortedRooms)).toBe(true);
    });

    it('treats shared wall adjacency without exits as sufficient for reordering', () => {
      const rooms = [
        _createRoom('upper', { x:0, y:0, width:40, height:20 }),
        _createRoom('lowerLeft', { x:0, y:20, width:20, height:20 }),
        _createRoom('lowerRight', { x:20, y:20, width:20, height:20 })
      ];

      const sortedRooms = sortRoomsForDrawingOrder(rooms);

      expect(sortedRooms.indexOf(rooms[0])).toBeGreaterThan(sortedRooms.indexOf(rooms[1]));
      expect(sortedRooms.indexOf(rooms[0])).toBeGreaterThan(sortedRooms.indexOf(rooms[2]));
      expect(areRoomsWellOrdered(sortedRooms)).toBe(true);
    });

    it('repeats the reordering pass until stacked rooms are all well ordered', () => {
      const rooms = [
        _createRoom('top', { x:0, y:0, width:20, height:20 }),
        _createRoom('middle', { x:0, y:20, width:20, height:20 }),
        _createRoom('bottom', { x:0, y:40, width:20, height:20 })
      ];

      const sortedRooms = sortRoomsForDrawingOrder(rooms);

      expect(sortedRooms.map(room => room.id)).toEqual(['bottom', 'middle', 'top']);
      expect(areRoomsWellOrdered(sortedRooms)).toBe(true);
    });
  });
});