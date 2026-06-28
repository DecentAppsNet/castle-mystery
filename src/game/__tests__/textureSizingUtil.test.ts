// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import { calcTextureFaceSize } from '../textureSizingUtil';

describe('textureSizingUtil.ts', () => {
  describe('calcTextureFaceSize()', () => {
    it('preserves existing size when it is already within the caps', () => {
      expect(calcTextureFaceSize(600, 600, 4, 4, 4, 4)).toEqual({ width:600, height:600 });
    });

    it('clamps giant low-count texture faces while preserving aspect ratio', () => {
      expect(calcTextureFaceSize(600, 600, 12, 8, 1, 1)).toEqual({ width:3547, height:2364 });
    });

    it('caps very wide faces by axis length before the pixel cap', () => {
      expect(calcTextureFaceSize(600, 600, 20, 2, 1, 1)).toEqual({ width:4096, height:409 });
    });
  });
});