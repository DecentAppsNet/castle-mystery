import { describe, expect, it } from 'vitest';

import { parseSections } from '@/common/markdownUtil';
import defaultLevelText from './fixtures/default-level.md?raw';
import { loadLevelForTest, loadValidLevelForTest, replaceSection } from './testLevelUtil';

describe('testLevelUtil', () => {
  describe('replaceSection()', () => {
    it('replaces a top-level section body', () => {
      const text = replaceSection(defaultLevelText, 'itinerary', [
        '0:00:05 Sam @ Closet',
        ': Sam says "Hi."'
      ]);

      expect(parseSections(text).itinerary).toBe('\n0:00:05 Sam @ Closet\n: Sam says "Hi."\n');
    });

    it('rejects a missing section', () => {
      expect(() => replaceSection(defaultLevelText, 'missing', [])).toThrow("section 'missing' not found");
    });
  });

  describe('loadLevelForTest()', () => {
    it('returns the loaded level and error collector', () => {
      const { level, errors } = loadLevelForTest(defaultLevelText, 'default-level.md');

      expect(level).not.toBeNull();
      expect(errors.describeErrors()).toBe('');
    });
  });

  describe('loadValidLevelForTest()', () => {
    it('returns a non-null valid level', () => {
      const level = loadValidLevelForTest(defaultLevelText, 'default-level.md');

      expect(level.activeCharacterId).toBe('sam');
    });
  });
});
