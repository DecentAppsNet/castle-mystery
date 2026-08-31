// Follow test conventions from CONTRIBUTING.md when editing this file.
import { expect, it, describe } from 'vitest';
import { clamp, interpolateNumber, interpolateNumberPair } from '../numberUtil';

describe('numberUtil.ts', () => {
  describe('clamp()', () => {
    it('should return min value when value is less than min', () => {
      expect(clamp(0, 1, 10)).toBe(1);
    });
    it('should return max value when value is greater than max', () => {
      expect(clamp(11, 1, 10)).toBe(10);
    });
    it('should return value when value is between min and max', () => {
      expect(clamp(5, 1, 10)).toBe(5);
    });
  });

  describe('interpolateNumber()', () => {
    it('returns the value at the requested linear progress', () => {
      expect(interpolateNumber(10, 30, 0.25)).toBe(15);
    });

    it('returns the exact target at complete progress', () => {
      const target = Number.MAX_VALUE;

      expect(interpolateNumber(-Number.MAX_VALUE, target, 1)).toBe(target);
    });

    it('does not extrapolate beyond complete progress', () => {
      expect(interpolateNumber(10, 30, 1.5)).toBe(30);
    });
  });

  describe('interpolateNumberPair()', () => {
    it('returns both values at the requested linear progress', () => {
      expect(interpolateNumberPair([10, -10], [30, 30], 0.25)).toEqual([15, 0]);
    });

    it('returns the exact target pair at complete progress', () => {
      const target:[number, number] = [Number.MAX_VALUE, -Number.MAX_VALUE];

      expect(interpolateNumberPair([-Number.MAX_VALUE, Number.MAX_VALUE], target, 1)).toEqual(target);
    });

    it('does not extrapolate either value beyond complete progress', () => {
      expect(interpolateNumberPair([10, -10], [30, 30], 1.5)).toEqual([30, 30]);
    });
  });
});