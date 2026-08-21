import { describe, expect, it } from 'vitest';

import { calcFloorSquareCenter, calcRoomFloorY, findNearestFloorSquareCenter } from '../squareUtil';
import { createDefaultRoom } from '../types/Room';

const room = {
  ...createDefaultRoom(),
  rect:{ x:10, y:20, width:20, height:40 }
};

describe('squareUtil', () => {
  describe('calcRoomFloorY()', () => {
    it('places the floor just inside the bottom room edge', () => {
      expect(calcRoomFloorY(room.rect)).toBe(59.999);
    });
  });

  describe('calcFloorSquareCenter()', () => {
    it('finds centers at the left and right room edges', () => {
      expect(calcFloorSquareCenter(room.rect, 0, 0)).toEqual({ x:12.5, y:59.999, z:0.1667 });
      expect(calcFloorSquareCenter(room.rect, 3, 0)).toEqual({ x:27.5, y:59.999, z:0.1667 });
    });

    it('finds the center of each depth row', () => {
      expect([0, 1, 2].map(rowI => calcFloorSquareCenter(room.rect, 0, rowI).z)).toEqual([0.1667, 0.5, 0.8333]);
    });
  });

  describe('findNearestFloorSquareCenter()', () => {
    it('clamps positions beyond every room edge', () => {
      expect(findNearestFloorSquareCenter(room, { x:-100, y:0, z:-100 })).toEqual({ x:12.5, y:59.999, z:0.1667 });
      expect(findNearestFloorSquareCenter(room, { x:100, y:100, z:100 })).toEqual({ x:27.5, y:59.999, z:0.8333 });
    });

    it('switches columns immediately across a halfway boundary', () => {
      expect(findNearestFloorSquareCenter(room, { x:14.999, y:0, z:0.5 }).x).toBe(12.5);
      expect(findNearestFloorSquareCenter(room, { x:15.001, y:0, z:0.5 }).x).toBe(17.5);
    });

    it('switches depth rows immediately across a halfway boundary', () => {
      const halfwayZ = (0.1667 + 0.5) / 2;
      expect(findNearestFloorSquareCenter(room, { x:12.5, y:0, z:halfwayZ - 0.001 }).z).toBe(0.1667);
      expect(findNearestFloorSquareCenter(room, { x:12.5, y:0, z:halfwayZ + 0.001 }).z).toBe(0.5);
    });
  });
});