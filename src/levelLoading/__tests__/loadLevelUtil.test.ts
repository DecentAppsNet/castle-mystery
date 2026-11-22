import { describe, expect, it } from 'vitest';

import defaultLevelText from './fixtures/default-level.md?raw';
import { loadValidLevelForTest } from './testLevelUtil';

describe('loadLevelUtil', () => {
  describe('loadLevelFromText()', () => {
    it('defaults omitted display metadata to empty strings', () => {
      const level = loadValidLevelForTest(defaultLevelText);

      expect(level.title).toBe('');
      expect(level.description).toBe('');
    });

    it('preserves authored display metadata without ID normalization', () => {
      const text = defaultLevelText.replace('# general', '# general\n* title=The Fledgling Fraternity!\n* description=In a Church at night,  conspirators gathered.\\nWho was there?');
      const level = loadValidLevelForTest(text);

      expect(level.title).toBe('The Fledgling Fraternity!');
      expect(level.description).toBe('In a Church at night,  conspirators gathered.\nWho was there?');
    });

    it('keeps explicitly empty display metadata as empty strings', () => {
      const text = defaultLevelText.replace('# general', '# general\n* title=\n* description=');
      const level = loadValidLevelForTest(text);

      expect(level.title).toBe('');
      expect(level.description).toBe('');
    });
  });
});