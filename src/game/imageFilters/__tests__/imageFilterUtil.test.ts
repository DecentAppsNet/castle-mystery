import { describe, expect, it } from 'vitest';

import { findImageFilterId } from '../imageFilterUtil';

describe('imageFilterUtil', () => {
  describe('findImageFilterId()', () => {
    it('recognizes the remaining supported image filters case-insensitively', () => {
      expect(findImageFilterId('Aged Stone')).toBe('aged stone');
      expect(findImageFilterId('PLASTER')).toBe('plaster');
      expect(findImageFilterId('street stones noon')).toBeNull();
    });
  });
});