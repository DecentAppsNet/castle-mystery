// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import { calcAngleBetweenPoints, calcShortestAngleDelta, interpolateAngle, normalizeAngle } from '../angleUtil';

describe('angleUtil.ts', () => {
  describe('normalizeAngle()', () => {
    it('wraps angles into the (-π, π] range', () => {
      expect(normalizeAngle(Math.PI * 3)).toBeCloseTo(Math.PI);
      expect(normalizeAngle(-Math.PI * 3)).toBeCloseTo(Math.PI);
      expect(normalizeAngle(Math.PI / 2)).toBeCloseTo(Math.PI / 2);
    });
  });

  describe('calcAngleBetweenPoints()', () => {
    it('returns the angle from one point to another', () => {
      expect(calcAngleBetweenPoints(0, 0, 0, 1)).toBeCloseTo(Math.PI / 2);
      expect(calcAngleBetweenPoints(0, 0, -1, 0)).toBeCloseTo(Math.PI);
    });
  });

  describe('calcShortestAngleDelta()', () => {
    it('returns the shortest wrapped delta between two angles', () => {
      expect(calcShortestAngleDelta(Math.PI * 0.9, -Math.PI * 0.9)).toBeCloseTo(Math.PI * 0.2);
      expect(calcShortestAngleDelta(-Math.PI * 0.9, Math.PI * 0.9)).toBeCloseTo(-Math.PI * 0.2);
    });
  });

  describe('interpolateAngle()', () => {
    it('interpolates across the shortest wrapped path', () => {
      const result = interpolateAngle(Math.PI * 0.9, -Math.PI * 0.9, 0.5);
      expect(result).toBeCloseTo(Math.PI);
    });
  });
});