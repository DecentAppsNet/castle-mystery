import { describe, expect, it } from 'vitest';

import { lineBeginsWithTimestamp, parseLeadingTimestamp, parseTimestampToMsecs } from '../timestampUtil';

describe('timestampUtil', () => {
  describe('parseTimestampToMsecs()', () => {
    it('parses h:mm timestamps', () => {
      expect(parseTimestampToMsecs('1:23')).toEqual(4_980_000);
    });

    it('parses h:mm:ss timestamps', () => {
      expect(parseTimestampToMsecs('2:03:04')).toEqual(7_384_000);
    });

    it('rejects invalid minute formatting', () => {
      expect(() => parseTimestampToMsecs('2:3')).toThrow();
    });
  });

  describe('parseLeadingTimestamp()', () => {
    it('returns timestamp and remaining text', () => {
      expect(parseLeadingTimestamp('  0:00:35 King faces Queen.')).toEqual({
        timestampText:'0:00:35',
        time:35_000,
        remainingText:'King faces Queen.'
      });
    });

    it('returns null for non-timestamp lines', () => {
      expect(parseLeadingTimestamp('King arrived in the library at 0:00:34.')).toBeNull();
    });
  });

  describe('lineBeginsWithTimestamp()', () => {
    it('detects valid leading timestamps', () => {
      expect(lineBeginsWithTimestamp('0:00 Queen takes Book')).toBe(true);
    });

    it('rejects lines without valid leading timestamps', () => {
      expect(lineBeginsWithTimestamp('soon Queen takes Book')).toBe(false);
    });
  });
});
