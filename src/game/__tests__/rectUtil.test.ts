// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import { isPositionInOrOnRect, isPositionStrictlyInRect } from '../rectUtil';
import Rect from '../types/Rect';

const ROOM_RECT:Rect = { x:10, y:20, width:30, height:40 };

describe('rectUtil.ts', () => {
  describe('isPositionInOrOnRect()', () => {
    it('returns true for positions on the rectangle boundary', () => {
      expect(isPositionInOrOnRect(10, 35, ROOM_RECT)).toBe(true);
      expect(isPositionInOrOnRect(40, 35, ROOM_RECT)).toBe(true);
      expect(isPositionInOrOnRect(25, 20, ROOM_RECT)).toBe(true);
      expect(isPositionInOrOnRect(25, 60, ROOM_RECT)).toBe(true);
    });
  });

  describe('isPositionStrictlyInRect()', () => {
    it('returns true for positions inside the rectangle away from the boundary', () => {
      expect(isPositionStrictlyInRect(25, 35, ROOM_RECT)).toBe(true);
    });

    it('returns false for positions on each rectangle boundary', () => {
      expect(isPositionStrictlyInRect(10, 35, ROOM_RECT)).toBe(false);
      expect(isPositionStrictlyInRect(40, 35, ROOM_RECT)).toBe(false);
      expect(isPositionStrictlyInRect(25, 20, ROOM_RECT)).toBe(false);
      expect(isPositionStrictlyInRect(25, 60, ROOM_RECT)).toBe(false);
    });
  });
});