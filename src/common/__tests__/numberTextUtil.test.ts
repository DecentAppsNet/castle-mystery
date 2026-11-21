import { describe, expect, it } from 'vitest';
import { toEnglishNumber } from '../numberTextUtil';

describe('numberTextUtil', () => {
  describe('toEnglishNumber()', () => {
    it('converts zero', () => {
      expect(toEnglishNumber(0)).toBe('zero');
    });

    it('converts one', () => {
      expect(toEnglishNumber(1)).toBe('one');
    });

    it('converts ten', () => {
      expect(toEnglishNumber(10)).toBe('ten');
    });

    it('converts irregular teen numbers', () => {
      expect(toEnglishNumber(12)).toBe('twelve');
    });

    it('converts the last teen number', () => {
      expect(toEnglishNumber(19)).toBe('nineteen');
    });

    it('converts twenty without a hyphen', () => {
      expect(toEnglishNumber(20)).toBe('twenty');
    });

    it('hyphenates compound numbers', () => {
      expect(toEnglishNumber(21)).toBe('twenty-one');
    });

    it('spells forty correctly', () => {
      expect(toEnglishNumber(40)).toBe('forty');
    });

    it('converts the upper boundary', () => {
      expect(toEnglishNumber(99)).toBe('ninety-nine');
    });

    it('returns negative values as strings', () => {
      expect(toEnglishNumber(-1)).toBe('-1');
    });

    it('returns values above the range as strings', () => {
      expect(toEnglishNumber(100)).toBe('100');
    });

    it('returns fractional values as strings', () => {
      expect(toEnglishNumber(1.5)).toBe('1.5');
    });

    it('returns infinity as a string', () => {
      expect(toEnglishNumber(Infinity)).toBe('Infinity');
    });

    it('returns NaN as a string', () => {
      expect(toEnglishNumber(NaN)).toBe('NaN');
    });
  });
});