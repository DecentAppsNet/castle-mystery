// Follow test conventions from CONTRIBUTING.md when editing this file.

import { describe, expect, it } from 'vitest';

import { formatMsecsAsTimestamp, tryParseAbsoluteTimestamp } from '../timestampUtil';

describe('timestampUtil', () => {
  describe('tryParseAbsoluteTimestamp()', () => {
    it('accepts a one-digit hour with minutes and seconds', () => {
      expect(tryParseAbsoluteTimestamp('1:02:03')).toBe(3_723_000);
    });

    it('accepts a two-digit hour with minutes and seconds', () => {
      expect(tryParseAbsoluteTimestamp('12:34:56')).toBe(45_296_000);
    });

    it('rejects a two-component timestamp', () => {
      expect(tryParseAbsoluteTimestamp('12:34')).toBeNull();
    });

    it('rejects a two-component timestamp that could be interpreted as minutes and seconds', () => {
      expect(tryParseAbsoluteTimestamp('01:02')).toBeNull();
    });
  });

  describe('formatMsecsAsTimestamp()', () => {
    it('rounds fractional milliseconds to the nearest authorable second', () => {
      expect(formatMsecsAsTimestamp(28_919_923)).toBe('8:02:00');
    });
  });
});
