import { afterEach, describe, expect, it, vi } from 'vitest';

import { createScratchCanvas } from '../canvasSurfaceUtil';

class FakeOffscreenCanvas {
  width:number;
  height:number;

  constructor(width:number, height:number) {
    this.width = width;
    this.height = height;
  }
}

describe('canvasSurfaceUtil', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('createScratchCanvas()', () => {
    it('asserts for non-finite dimensions before constructing OffscreenCanvas', () => {
      const offscreenCanvasSpy = vi.fn((width:number, height:number) => new FakeOffscreenCanvas(width, height));
      vi.stubGlobal('OffscreenCanvas', offscreenCanvasSpy);

      expect(() => createScratchCanvas(Number.NaN, 12)).toThrow('Assertion failed.');
      expect(offscreenCanvasSpy).not.toHaveBeenCalled();
    });

    it('rounds fractional dimensions before constructing OffscreenCanvas', () => {
      vi.stubGlobal('OffscreenCanvas', FakeOffscreenCanvas);

      const canvas = createScratchCanvas(12.4, 9.6) as FakeOffscreenCanvas | null;

      expect(canvas).toBeInstanceOf(FakeOffscreenCanvas);
      expect(canvas?.width).toBe(12);
      expect(canvas?.height).toBe(10);
    });
  });
});