import { describe, expect, it } from 'vitest';

import { validateFilename } from '../filenameValidationUtil';

describe('filenameValidationUtil', () => {
  describe('validateFilename()', () => {
    it('accepts a plain filename', () => {
      expect(() => validateFilename('village.md', 'imports entry')).not.toThrow();
    });

    it('rejects an empty filename', () => {
      expect(() => validateFilename('', 'imports entry')).toThrow('imports entry must be a filename');
    });

    it('rejects paths and urls', () => {
      expect(() => validateFilename('../village.md', 'imports entry')).toThrow('imports entry must be a filename, not a path or URL');
      expect(() => validateFilename('https://example.com/village.md', 'imports entry')).toThrow('imports entry must be a filename, not a path or URL');
    });
  });
});
