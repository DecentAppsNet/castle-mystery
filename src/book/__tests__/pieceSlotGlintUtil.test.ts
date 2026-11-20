import { describe, expect, it } from 'vitest';
import Point from '@/game/types/Point';
import { calcPieceSlotGlintPoint } from '../pieceSlotGlintUtil';

const rectangle:Point[] = [[-4, -2], [4, -2], [4, 2], [-4, 2]];

describe('pieceSlotGlintUtil', () => {
  describe('calcPieceSlotGlintPoint()', () => {
    it('points right at zero radians, ignoring parallel edges', () => {
      expect(calcPieceSlotGlintPoint([0, 0], rectangle, 0)).toEqual([4, 0]);
    });

    it('points upward at a positive quarter turn', () => {
      const [x, y] = calcPieceSlotGlintPoint([0, 0], rectangle, Math.PI / 2);
      expect(x).toBeCloseTo(0);
      expect(y).toBeCloseTo(-2);
    });

    it('intersects the actual top edge diagonally rather than the bounding corner', () => {
      const [x, y] = calcPieceSlotGlintPoint([0, 0], rectangle, Math.PI / 4);
      expect(x).toBeCloseTo(2);
      expect(y).toBeCloseTo(-2);
    });

    it('includes an intersection shared by two edges at a vertex', () => {
      const square:Point[] = [[-2, -2], [2, -2], [2, 2], [-2, 2]];
      const [x, y] = calcPieceSlotGlintPoint([0, 0], square, Math.PI / 4);
      expect(x).toBeCloseTo(2);
      expect(y).toBeCloseTo(-2);
    });

    it('chooses the nearest forward edge of a concave polygon', () => {
      const notched:Point[] = [[-4, -3], [4, -3], [4, -1], [1, -1], [1, 1], [4, 1], [4, 3], [-4, 3]];
      expect(calcPieceSlotGlintPoint([0, 0], notched, 0)).toEqual([1, 0]);
    });

    it('does not depend on polygon winding', () => {
      const [x, y] = calcPieceSlotGlintPoint([0, 0], [...rectangle].reverse(), Math.PI);
      expect(x).toBeCloseTo(-4);
      expect(y).toBeCloseTo(0);
    });

    it('translates the intersection with the center without changing the perimeter selection', () => {
      const translated:Point[] = rectangle.map(([x, y]) => [x + 15, y + 20]);
      const [x, y] = calcPieceSlotGlintPoint([15, 20], translated, Math.PI / 4);
      expect(x).toBeCloseTo(17);
      expect(y).toBeCloseTo(18);
    });

    it('accepts negative angles and additional revolutions directly in radians', () => {
      const [x, y] = calcPieceSlotGlintPoint([0, 0], rectangle, -Math.PI / 2 + Math.PI * 4);
      expect(x).toBeCloseTo(0);
      expect(y).toBeCloseTo(2);
    });
  });
});