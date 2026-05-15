import { describe, expect, it } from 'vitest';

import { convertNumberToRomanNumeral } from '../romanNumeralUtil';

describe('romanNumeralUtil', () => {
  describe('convertNumberToRomanNumeral()', () => {
    it('returns 0 for zero', () => {
      expect(convertNumberToRomanNumeral(0)).toBe('0');
    });

    it('converts basic additive and subtractive values', () => {
      expect(convertNumberToRomanNumeral(4)).toBe('IV');
      expect(convertNumberToRomanNumeral(9)).toBe('IX');
      expect(convertNumberToRomanNumeral(14)).toBe('XIV');
      expect(convertNumberToRomanNumeral(44)).toBe('XLIV');
      expect(convertNumberToRomanNumeral(99)).toBe('XCIX');
    });

    it('converts larger values up to 500', () => {
      expect(convertNumberToRomanNumeral(294)).toBe('CCXCIV');
      expect(convertNumberToRomanNumeral(400)).toBe('CD');
      expect(convertNumberToRomanNumeral(500)).toBe('D');
    });

    it('throws for values outside the supported range', () => {
      expect(() => convertNumberToRomanNumeral(-1)).toThrow();
      expect(() => convertNumberToRomanNumeral(501)).toThrow();
      expect(() => convertNumberToRomanNumeral(1.5)).toThrow();
    });
  });
});
