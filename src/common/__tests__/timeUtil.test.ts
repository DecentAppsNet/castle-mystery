import { describe, expect, it } from 'vitest';
import { minutesToMsecs, msecsToMinutes } from '../timeUtil';

describe('timeUtil', () => {
  describe('msecsToMinutes()', () => {
    it('preserves fractional minutes', () => {
      expect(msecsToMinutes(90000)).toBe(1.5);
    });
    it('preserves extended-hour coordinates', () => {
      expect(msecsToMinutes(90000000)).toBe(1500);
    });
  });
  describe('minutesToMsecs()', () => {
    it('preserves fractional minutes', () => {
      expect(minutesToMsecs(1.5)).toBe(90000);
    });
    it('preserves extended-hour coordinates', () => {
      expect(minutesToMsecs(1500)).toBe(90000000);
    });
  });
});