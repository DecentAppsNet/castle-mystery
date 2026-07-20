import { describe, it, expect } from 'vitest';

import { ErrorCollector } from '../errorCollectionApi';

describe('errorCollectionApi', () => {
  describe('ErrorCollector', () => {
    it('instances an object', () => {
      const collector = new ErrorCollector({}, []);

      expect(collector).toBeInstanceOf(ErrorCollector);
      expect(collector.describeErrors()).toBe('');
    });

    it('adds a parse error with addParseErrorAtLine()', () => {
      const collector = new ErrorCollector({}, [
        { filename: 'unused.md', lineNo: 0 },
        { filename: 'level.md', lineNo: 17 },
      ]);

      collector.addParseErrorAtLine('missing-token', 'a room id', 'kitchen?', 'Check syntax.', 1, 4, 11);

      expect(collector.describeErrors()).toBe(
        'level.md:17:4: Found "kitchen?" when expecting a room id. Check syntax.'
      );
    });

    it('throws when calling addParseError() without previously setting line#', () => {
      const collector = new ErrorCollector({}, []);

      expect(() => collector.addParseError('missing-token', 'a room id', 'kitchen?', '', 4, 11)).toThrow('Call setLine() first.');
    });

    it('adds a parse error with addParseError()', () => {
      const collector = new ErrorCollector({}, [
        { filename: 'unused.md', lineNo: 0 },
        { filename: 'level.md', lineNo: 17 },
      ]);

      collector.setLine(1);
      collector.addParseError('missing-token', 'a room id', 'kitchen?', 'Check syntax.', 4, 11);

      expect(collector.describeErrors()).toBe(
        'level.md:17:4: Found "kitchen?" when expecting a room id. Check syntax.'
      );
    });

    it('maps line# to a different section-offseted line#', () => {
      const collector = new ErrorCollector(
        { rooms: 2 },
        [
          { filename: 'unused.md', lineNo: 0 },
          { filename: 'unused.md', lineNo: 1 },
          { filename: 'unused.md', lineNo: 2 },
          { filename: 'level.md', lineNo: 40 },
        ]
      );

      collector.addParseErrorAtLine('missing-token', 'a room id', 'kitchen?', '', 1, 4, 11, 'rooms');

      expect(collector.describeErrors()).toBe(
        'level.md:40:4: Found "kitchen?" when expecting a room id.'
      );
    });

    it('maps line# to a different filename/line# based on source line map', () => {
      const collector = new ErrorCollector({}, [
        { filename: 'unused.md', lineNo: 0 },
        { filename: 'shared-characters.md', lineNo: 23 },
      ]);

      collector.setLine(1);
      collector.addParseError('missing-token', 'a title', '???', '', 8, 10);

      expect(collector.describeErrors()).toBe(
        'shared-characters.md:23:8: Found "???" when expecting a title.'
      );
    });
  });
});