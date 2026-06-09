// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import { createRect, doRectsOverlap, extendRectToContainRect, isPositionInOrOnRect, isPositionStrictlyInRect } from '../rectUtil';
import Rect from '../types/Rect';

const ROOM_RECT:Rect = { x:10, y:20, width:30, height:40 };

describe('rectUtil.ts', () => {
  describe('createRect()', () => {
    it('creates a rect object from x y width and height', () => {
      expect(createRect(1, 2, 3, 4)).toEqual({ x:1, y:2, width:3, height:4 });
    });
  });

  describe('doRectsOverlap()', () => {
    it('returns true when one rect fully contains the other', () => {
      expect(doRectsOverlap(
        { x:10, y:10, width:40, height:40 },
        { x:20, y:20, width:10, height:10 }
      )).toBe(true);
    });

    it('returns true when one rect is fully contained by the other', () => {
      expect(doRectsOverlap(
        { x:20, y:20, width:10, height:10 },
        { x:10, y:10, width:40, height:40 }
      )).toBe(true);
    });

    it('returns true when rects partially overlap', () => {
      expect(doRectsOverlap(
        { x:10, y:10, width:20, height:20 },
        { x:25, y:25, width:20, height:20 }
      )).toBe(true);
    });

    it('returns false when rects are separated', () => {
      expect(doRectsOverlap(
        { x:10, y:10, width:20, height:20 },
        { x:40, y:40, width:20, height:20 }
      )).toBe(false);
    });

    it('returns false when rects only touch at an edge', () => {
      expect(doRectsOverlap(
        { x:10, y:10, width:20, height:20 },
        { x:30, y:10, width:20, height:20 }
      )).toBe(false);
      expect(doRectsOverlap(
        { x:10, y:10, width:20, height:20 },
        { x:10, y:30, width:20, height:20 }
      )).toBe(false);
    });

    it('returns false when rects only touch at a corner', () => {
      expect(doRectsOverlap(
        { x:10, y:10, width:20, height:20 },
        { x:30, y:30, width:20, height:20 }
      )).toBe(false);
    });
  });

  describe('extendRectToContainRect()', () => {
    it('returns the smallest rect containing both inputs', () => {
      expect(extendRectToContainRect(
        { x:10, y:20, width:30, height:40 },
        { x:0, y:30, width:25, height:50 }
      )).toEqual({ x:0, y:20, width:40, height:60 });
    });
  });

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