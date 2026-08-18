import { describe, expect, it } from 'vitest';

import { COLUMN_WIDTH, LAYER_HEIGHT } from '../roomGridUtil';
import { arePositionsAdjacent, arePositionsEqual, arePositionsOrthogonal } from '../positionUtil';
import { ROOM_BACK_ROW_CENTER_Z, ROOM_MIDDLE_ROW_CENTER_Z } from '../roomSpaceConstants';

describe('positionUtil', () => {
  describe('arePositionsEqual()', () => {
    it('returns true when all coordinates are equal', () => {
      expect(arePositionsEqual({ x:1, y:2, z:3 }, { x:1, y:2, z:3 })).toBe(true);
    });

    it('returns false when a coordinate differs', () => {
      expect(arePositionsEqual({ x:1, y:2, z:3 }, { x:2, y:2, z:3 })).toBe(false);
    });
  });

  describe('arePositionsOrthogonal()', () => {
    it('returns true when exactly two coordinates are equal', () => {
      expect(arePositionsOrthogonal({ x:1, y:2, z:3 }, { x:4, y:2, z:3 })).toBe(true);
    });

    it('returns false when fewer than two coordinates are equal', () => {
      expect(arePositionsOrthogonal({ x:1, y:2, z:3 }, { x:4, y:5, z:3 })).toBe(false);
    });

    it('returns false for equal positions', () => {
      expect(arePositionsOrthogonal({ x:1, y:2, z:3 }, { x:1, y:2, z:3 })).toBe(false);
    });
  });

  describe('arePositionsAdjacent()', () => {
    it('allows one layer of y separation and diagonal adjacent-row and column distance', () => {
      expect(arePositionsAdjacent(
        { x:0, y:0, z:ROOM_BACK_ROW_CENTER_Z },
        { x:COLUMN_WIDTH, y:LAYER_HEIGHT, z:ROOM_MIDDLE_ROW_CENTER_Z }
      )).toBe(true);
    });

    it('returns false when y separation exceeds one layer', () => {
      expect(arePositionsAdjacent(
        { x:0, y:0, z:ROOM_BACK_ROW_CENTER_Z },
        { x:0, y:LAYER_HEIGHT + 0.001, z:ROOM_BACK_ROW_CENTER_Z }
      )).toBe(false);
    });

    it('returns false when xz distance exceeds an adjacent row and column', () => {
      expect(arePositionsAdjacent(
        { x:0, y:0, z:ROOM_BACK_ROW_CENTER_Z },
        { x:COLUMN_WIDTH + 1, y:0, z:ROOM_MIDDLE_ROW_CENTER_Z }
      )).toBe(false);
    });
  });
});
