import { describe, expect, it } from 'vitest';
import { findVisibleImageSourceRect } from '../imageBoundsUtil';

describe('imageBoundsUtil', () => {
  describe('findVisibleImageSourceRect()', () => {
    it('returns null for fully transparent pixels', () => {
      const data = new Uint8ClampedArray(3 * 2 * 4);

      expect(findVisibleImageSourceRect(data, 3, 2)).toBeNull();
    });

    it('finds an isolated pixel on the right edge', () => {
      const data = new Uint8ClampedArray(3 * 2 * 4);
      data[(0 * 3 + 2) * 4 + 3] = 255;

      expect(findVisibleImageSourceRect(data, 3, 2)).toEqual({ x:2, y:0, width:1, height:1 });
    });

    it('finds rectangular visible content within transparent padding', () => {
      const data = new Uint8ClampedArray(5 * 4 * 4);
      data[(1 * 5 + 1) * 4 + 3] = 255;
      data[(1 * 5 + 2) * 4 + 3] = 255;
      data[(1 * 5 + 3) * 4 + 3] = 255;
      data[(2 * 5 + 1) * 4 + 3] = 255;
      data[(2 * 5 + 2) * 4 + 3] = 255;
      data[(2 * 5 + 3) * 4 + 3] = 255;

      expect(findVisibleImageSourceRect(data, 5, 4)).toEqual({ x:1, y:1, width:3, height:2 });
    });

    it('excludes pixels with alpha 15', () => {
      const data = new Uint8ClampedArray([255, 255, 255, 15]);

      expect(findVisibleImageSourceRect(data, 1, 1)).toBeNull();
    });

    it('includes pixels with alpha 16 without including adjacent alpha 15', () => {
      const data = new Uint8ClampedArray([0, 0, 0, 15, 0, 0, 0, 16]);

      expect(findVisibleImageSourceRect(data, 2, 1)).toEqual({ x:1, y:0, width:1, height:1 });
    });

    it('includes the rightmost and bottommost visible pixels in the extents', () => {
      const data = new Uint8ClampedArray(4 * 3 * 4);
      data[(1 * 4 + 1) * 4 + 3] = 255;
      data[(2 * 4 + 3) * 4 + 3] = 255;

      expect(findVisibleImageSourceRect(data, 4, 3)).toEqual({ x:1, y:1, width:3, height:2 });
    });
  });
});