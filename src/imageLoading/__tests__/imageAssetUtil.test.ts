import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { stubOffscreenCanvas } from '@/game/test/stubOffscreenCanvas';
import { createImageAsset } from '../imageAssetUtil';

function _stubImageReadback(readPixels:(() => Uint8ClampedArray)|null) {
  vi.stubGlobal('OffscreenCanvas', class {
    getContext() {
      if (!readPixels) return null;
      return {
        drawImage() {},
        getImageData:() => ({ data:readPixels() })
      };
    }
  });
}

describe('imageAssetUtil', () => {
  beforeEach(() => {
    stubOffscreenCanvas();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('createImageAsset()', () => {
    it('retains the original image and punch mask identities', () => {
      const image = { width:2, height:1 } as ImageBitmap;
      const punchMaskImage = { width:2, height:1 } as ImageBitmap;

      const asset = createImageAsset(image, punchMaskImage);

      expect(asset.image).toBe(image);
      expect(asset.punchMaskImage).toBe(punchMaskImage);
    });

    it('leaves the punch mask absent when none is supplied', () => {
      const asset = createImageAsset({ width:1, height:1 } as ImageBitmap);

      expect(asset.punchMaskImage).toBeNull();
    });

    it('calculates bounds in original image coordinates using the real pixel scan', () => {
      const data = new Uint8ClampedArray(4 * 3 * 4);
      data[(1 * 4 + 1) * 4 + 3] = 15;
      data[(1 * 4 + 2) * 4 + 3] = 16;
      data[(2 * 4 + 3) * 4 + 3] = 255;
      _stubImageReadback(() => data);

      const asset = createImageAsset({ width:4, height:3 } as ImageBitmap);

      expect(asset.visibleSourceRect).toEqual({ x:2, y:1, width:2, height:2 });
    });

    it('records null bounds for a successfully analyzed transparent image', () => {
      const asset = createImageAsset({ width:2, height:3 } as ImageBitmap);

      expect(asset.visibleSourceRect).toBeNull();
    });

    it('rejects a missing readback context rather than treating the image as transparent', () => {
      _stubImageReadback(null);

      expect(() => createImageAsset({ width:1, height:1 } as ImageBitmap))
        .toThrow('Could not create scratch canvas 2D context');
    });

    it('propagates readback failure rather than treating the image as transparent', () => {
      const failure = new Error('Pixel readback failed');
      _stubImageReadback(() => { throw failure; });

      expect(() => createImageAsset({ width:1, height:1 } as ImageBitmap)).toThrow(failure);
    });
  });
});