import { describe, expect, it } from 'vitest';
import { convertStraightQuotesToDirectional } from '../quoteUtil';

describe('quoteUtil', () => {
  describe('convertStraightQuotesToDirectional()', () => {
    it('preserves empty text', () => {
      expect(convertStraightQuotesToDirectional('')).toBe('');
    });

    it('preserves text without straight double quotes, including single quotes', () => {
      expect(convertStraightQuotesToDirectional("He can't say 'why'.")).toBe("He can't say 'why'.");
    });

    it('alternates opening and closing quotes across multiple pairs', () => {
      expect(convertStraightQuotesToDirectional('"Hello," she said. "Goodbye."'))
        .toBe('\u201CHello,\u201D she said. \u201CGoodbye.\u201D');
    });

    it('converts an unmatched odd quote to an opening quote', () => {
      expect(convertStraightQuotesToDirectional('"First" and "unfinished'))
        .toBe('\u201CFirst\u201D and \u201Cunfinished');
    });

    it('leaves directional quotes unchanged without counting them', () => {
      expect(convertStraightQuotesToDirectional('\u201CExisting\u201D "new"'))
        .toBe('\u201CExisting\u201D \u201Cnew\u201D');
    });

    it('converts adjacent quotes and restarts the sequence for each call', () => {
      expect(convertStraightQuotesToDirectional('""')).toBe('\u201C\u201D');
      expect(convertStraightQuotesToDirectional('"')).toBe('\u201C');
      expect(convertStraightQuotesToDirectional('"')).toBe('\u201C');
    });
  });
});