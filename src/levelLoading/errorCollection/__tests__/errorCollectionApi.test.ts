import { describe, it, expect } from 'vitest';

import { ErrorCollector } from '..';

describe('errorCollectionApi', () => {
  describe('ErrorCollector', () => {
    it('instances an object', () => {
      const collector = new ErrorCollector('', []);

      expect(collector).toBeInstanceOf(ErrorCollector);
      expect(collector.describeErrors()).toBe('');
    });

    it('throws when calling add() without previously setting line#', () => {
      const collector = new ErrorCollector('', []);

      expect(() => collector.add('Problem.')).toThrow('Call setLine() first.');
    });

    it('maps a combined line index to the correct source filename and line number with setNextLine()', () => {
      const collector = new ErrorCollector('alpha\nbeta', [
        { filename: 'level.md', lineNo: 17 },
        { filename: 'imported.md', lineNo: 42 },
      ]);

      collector.setNextLine(1, 2, 4);
      collector.add('Problem.');

      expect(collector.describeErrors()).toBe('imported.md:42:2: Problem.');
    });

    it('adds an error with addAt()', () => {
      const collector = new ErrorCollector(
        '# general\nintro\n# rooms\n## Kitchen\n* exits=Hall',
        [
          { filename: 'level.md', lineNo: 10 },
          { filename: 'level.md', lineNo: 11 },
          { filename: 'level.md', lineNo: 12 },
          { filename: 'level.md', lineNo: 13 },
          { filename: 'rooms.md', lineNo: 73 },
        ]
      );

      collector.addAt('Problem.', ['rooms', 'Kitchen'], '* exits', 'Hall');

      expect(collector.describeErrors()).toBe('rooms.md:73:8: Problem.');
    });

    it('maps a combined line index to the correct source location with addAtLine()', () => {
      const collector = new ErrorCollector('alpha\nbeta\ngamma', [
        { filename:'level.md', lineNo:17 },
        { filename:'imported.md', lineNo:42 },
        { filename:'level.md', lineNo:19 }
      ]);

      collector.addAtLine('Problem.', 1);

      expect(collector.describeErrors()).toBe('imported.md:42:0: Problem.');
    });

    it('uses an explicit character range with addAtLine()', () => {
      const collector = new ErrorCollector('alpha\nbeta', [
        { filename:'level.md', lineNo:17 },
        { filename:'imported.md', lineNo:42 }
      ]);

      collector.addAtLine('Problem.', 1, 2, 4);

      expect(collector.describeErrors()).toBe('imported.md:42:2: Problem.');
    });
  });
});