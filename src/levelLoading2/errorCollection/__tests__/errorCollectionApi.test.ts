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

    it('adds an error with setNextLine() and add()', () => {
      const collector = new ErrorCollector('alpha\nbeta', [
        { filename: 'level.md', lineNo: 17 },
        { filename: 'level.md', lineNo: 18 },
      ]);

      collector.setNextLine(1, 2, 4);
      collector.add('Problem.');

      expect(collector.describeErrors()).toBe('level.md:18:2: Problem.');
    });

    it('adds an error with addAt()', () => {
      const collector = new ErrorCollector(
        '# general\nintro\n# rooms\n## Kitchen\n* exits=Hall',
        [
          { filename: 'level.md', lineNo: 10 },
          { filename: 'level.md', lineNo: 11 },
          { filename: 'level.md', lineNo: 12 },
          { filename: 'level.md', lineNo: 13 },
          { filename: 'level.md', lineNo: 14 },
        ]
      );

      collector.addAt('Problem.', ['rooms', 'Kitchen'], '* exits', 'Hall');

      expect(collector.describeErrors()).toBe('level.md:12:8: Problem.');
    });
  });
});