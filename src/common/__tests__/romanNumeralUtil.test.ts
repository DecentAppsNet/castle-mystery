import { describe, expect, it } from 'vitest';
import { toNumeral } from '../romanNumeralUtil';

describe('romanNumeralUtil', () => {
  describe('toNumeral()', () => {
    it('returns an empty string for zero', () => {
      expect(toNumeral(0)).toBe('');
    });

    it('converts one', () => {
      expect(toNumeral(1)).toBe('I');
    });

    it('combines additive digits', () => {
      expect(toNumeral(888)).toBe('DCCCLXXXVIII');
    });

    it('uses subtractive fours', () => {
      expect(toNumeral(444)).toBe('CDXLIV');
    });

    it('uses subtractive nines at the upper boundary', () => {
      expect(toNumeral(999)).toBe('CMXCIX');
    });

    it('returns negative values as strings', () => {
      expect(toNumeral(-1)).toBe('-1');
    });

    it('returns values above the range as strings', () => {
      expect(toNumeral(1000)).toBe('1000');
    });

    it('returns fractional values as strings', () => {
      expect(toNumeral(1.5)).toBe('1.5');
    });

    it('returns infinity as a string', () => {
      expect(toNumeral(Infinity)).toBe('Infinity');
    });

    it('returns NaN as a string', () => {
      expect(toNumeral(NaN)).toBe('NaN');
    });
  });
});