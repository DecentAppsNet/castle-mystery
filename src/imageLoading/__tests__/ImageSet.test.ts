import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { stubOffscreenCanvas } from '@/game/test/stubOffscreenCanvas';
import ImageSet from '../ImageSet';

describe('ImageSet', () => {
  beforeEach(() => {
    stubOffscreenCanvas();
    vi.stubGlobal('window', { location:{ pathname:'/castle-mystery/' } });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Blob(), {
      headers:{ 'content-type':'image/png' }
    })));
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width:2, height:1, close:vi.fn() })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('findImage()', () => {
    it('returns null for an absent image without performing I/O', () => {
      const imageSet = new ImageSet();

      expect(imageSet.findImage('/assets/items/test.png')).toBeNull();
      expect(imageSet.size).toBe(0);
      expect(fetch).not.toHaveBeenCalled();
      expect(createImageBitmap).not.toHaveBeenCalled();
    });
  });

  describe('removeUnrequiredImages()', () => {
    it('preserves retained asset identity and leaves its bitmaps open', async () => {
      const imageSet = new ImageSet();
      const asset = await imageSet.loadImage('/assets/items/retained.png', true);

      imageSet.removeUnrequiredImages(new Set(['/assets/items/retained.png']));

      expect(imageSet.findImage('/assets/items/retained.png')).toBe(asset);
      expect(imageSet.size).toBe(1);
      expect(asset.image.close).not.toHaveBeenCalled();
      expect(asset.punchMaskImage?.close).not.toHaveBeenCalled();
    });

    it('removes only unrequired entries and closes their primary bitmaps without masks', async () => {
      const imageSet = new ImageSet();
      const retained = await imageSet.loadImage('/assets/items/retained.png');
      const removed = await imageSet.loadImage('/assets/items/removed.png');
      const alsoRemoved = await imageSet.loadImage('/assets/items/alsoRemoved.png');

      imageSet.removeUnrequiredImages(new Set(['/assets/items/retained.png']));

      expect(imageSet.findImage('/assets/items/retained.png')).toBe(retained);
      expect(imageSet.findImage('/assets/items/removed.png')).toBeNull();
      expect(imageSet.findImage('/assets/items/alsoRemoved.png')).toBeNull();
      expect(imageSet.size).toBe(1);
      expect(retained.image.close).not.toHaveBeenCalled();
      expect(removed.punchMaskImage).toBeNull();
      expect(removed.image.close).toHaveBeenCalledTimes(1);
      expect(alsoRemoved.image.close).toHaveBeenCalledTimes(1);
    });

    it('closes both the primary bitmap and optional punch mask on removal', async () => {
      const imageSet = new ImageSet();
      const asset = await imageSet.loadImage('/assets/items/removed.png', true);
      expect(asset.punchMaskImage).not.toBeNull();

      imageSet.removeUnrequiredImages(new Set());

      expect(imageSet.findImage('/assets/items/removed.png')).toBeNull();
      expect(imageSet.size).toBe(0);
      expect(asset.image.close).toHaveBeenCalledTimes(1);
      expect(asset.punchMaskImage?.close).toHaveBeenCalledTimes(1);
    });

    it('does not close removed bitmaps again on repeated pruning', async () => {
      const imageSet = new ImageSet();
      const asset = await imageSet.loadImage('/assets/items/removed.png', true);

      imageSet.removeUnrequiredImages(new Set());
      imageSet.removeUnrequiredImages(new Set());

      expect(imageSet.size).toBe(0);
      expect(asset.image.close).toHaveBeenCalledTimes(1);
      expect(asset.punchMaskImage?.close).toHaveBeenCalledTimes(1);
    });

    it('does not load missing required URLs', () => {
      const imageSet = new ImageSet();

      imageSet.removeUnrequiredImages(new Set(['/assets/items/missing.png']));

      expect(imageSet.findImage('/assets/items/missing.png')).toBeNull();
      expect(imageSet.size).toBe(0);
      expect(fetch).not.toHaveBeenCalled();
      expect(createImageBitmap).not.toHaveBeenCalled();
    });

    it('allows a removed URL to load again with a new asset', async () => {
      const imageSet = new ImageSet();
      const removed = await imageSet.loadImage('/assets/items/test.png');
      imageSet.removeUnrequiredImages(new Set());
      vi.mocked(fetch).mockClear();

      const reloaded = await imageSet.loadImage('/assets/items/test.png');

      expect(reloaded).not.toBe(removed);
      expect(reloaded.image).not.toBe(removed.image);
      expect(imageSet.findImage('/assets/items/test.png')).toBe(reloaded);
      expect(imageSet.size).toBe(1);
      expect(removed.image.close).toHaveBeenCalledTimes(1);
      expect(reloaded.image.close).not.toHaveBeenCalled();
      expect(fetch).toHaveBeenCalledExactlyOnceWith('/castle-mystery/assets/items/test.png');
    });
  });

  describe('loadImage()', () => {
    it('keeps a pending fetch out of synchronous lookup', async () => {
      const response = Promise.withResolvers<Response>();
      vi.mocked(fetch).mockReturnValue(response.promise);
      const imageSet = new ImageSet();

      const loading = imageSet.loadImage('/assets/items/test.png');

      expect(imageSet.findImage('/assets/items/test.png')).toBeNull();
      expect(imageSet.size).toBe(0);
      response.resolve(new Response(new Blob()));
      const asset = await loading;
      expect(imageSet.findImage('/assets/items/test.png')).toBe(asset);
      expect(imageSet.size).toBe(1);
    });

    it('registers only after decode and real pixel analysis complete', async () => {
      const decoding = Promise.withResolvers<ImageBitmap>();
      const decodeStarted = Promise.withResolvers<void>();
      vi.mocked(createImageBitmap).mockImplementation(() => {
        decodeStarted.resolve();
        return decoding.promise;
      });
      const data = new Uint8ClampedArray([0, 0, 0, 15, 0, 0, 0, 16]);
      vi.stubGlobal('OffscreenCanvas', class {
        getContext() {
          return { drawImage() {}, getImageData:() => ({ data }) };
        }
      });
      const imageSet = new ImageSet();

      const loading = imageSet.loadImage('/assets/items/test.png');
      await decodeStarted.promise;

      expect(imageSet.findImage('/assets/items/test.png')).toBeNull();
      const image = { width:2, height:1 } as ImageBitmap;
      decoding.resolve(image);
      const asset = await loading;
      expect(asset.image).toBe(image);
      expect(asset.visibleSourceRect).toEqual({ x:1, y:0, width:1, height:1 });
      expect(imageSet.findImage('/assets/items/test.png')).toBe(asset);
      expect(imageSet.findImage('/castle-mystery/assets/items/test.png')).toBeNull();
    });

    it('rejects unsuccessful primary responses with the URL and no registration', async () => {
      vi.mocked(fetch).mockResolvedValue(new Response(null, { status:404 }));
      const imageSet = new ImageSet();

      await expect(imageSet.loadImage('/assets/items/missing.png'))
        .rejects.toThrow('Could not load image /assets/items/missing.png: Image fetch failed (404)');
      expect(imageSet.findImage('/assets/items/missing.png')).toBeNull();
      expect(imageSet.size).toBe(0);
    });

    it('rejects primary network failures with the URL and no registration', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network failed'));
      const imageSet = new ImageSet();

      await expect(imageSet.loadImage('/assets/items/test.png'))
        .rejects.toThrow('Could not load image /assets/items/test.png: Network failed');
      expect(imageSet.size).toBe(0);
    });

    it('rejects decode failures with the URL and no registration', async () => {
      vi.mocked(createImageBitmap).mockRejectedValue(new Error('Decode failed'));
      const imageSet = new ImageSet();

      await expect(imageSet.loadImage('/assets/items/test.png'))
        .rejects.toThrow('Could not load image /assets/items/test.png: Decode failed');
      expect(imageSet.size).toBe(0);
    });

    it('rejects analysis failures with the URL and no registration', async () => {
      vi.stubGlobal('OffscreenCanvas', class {
        getContext() {
          return { drawImage() {}, getImageData() { throw new Error('Readback failed'); } };
        }
      });
      const imageSet = new ImageSet();

      await expect(imageSet.loadImage('/assets/items/test.png'))
        .rejects.toThrow('Could not load image /assets/items/test.png: Readback failed');
      expect(imageSet.size).toBe(0);
    });

    it('does not request a mask when the flag is omitted', async () => {
      const imageSet = new ImageSet();

      const asset = await imageSet.loadImage('/assets/items/test.png');

      expect(asset.punchMaskImage).toBeNull();
      expect(fetch).toHaveBeenCalledExactlyOnceWith('/castle-mystery/assets/items/test.png');
    });

    it('does not request a mask when the flag is false', async () => {
      const imageSet = new ImageSet();

      const asset = await imageSet.loadImage('/assets/items/test.png', false);

      expect(asset.punchMaskImage).toBeNull();
      expect(fetch).toHaveBeenCalledExactlyOnceWith('/castle-mystery/assets/items/test.png');
    });

    it('associates the optional mask without changing its bitmap identity', async () => {
      const image = { width:2, height:1 } as ImageBitmap;
      const mask = { width:2, height:1 } as ImageBitmap;
      vi.mocked(createImageBitmap).mockResolvedValueOnce(image).mockResolvedValueOnce(mask);
      const imageSet = new ImageSet();

      const asset = await imageSet.loadImage('/assets/items/test.PNG', true);

      expect(asset.image).toBe(image);
      expect(asset.punchMaskImage).toBe(mask);
      expect(fetch).toHaveBeenCalledWith('/castle-mystery/assets/items/test.punch.png');
    });

    it('keeps an asset hidden until its optional mask finishes loading', async () => {
      const maskResponse = Promise.withResolvers<Response>();
      const maskRequested = Promise.withResolvers<void>();
      vi.mocked(fetch).mockImplementation(async url => {
        if (String(url).endsWith('.punch.png')) {
          maskRequested.resolve();
          return maskResponse.promise;
        }
        return new Response(new Blob());
      });
      const imageSet = new ImageSet();
      const loading = imageSet.loadImage('/assets/items/test.png', true);
      await maskRequested.promise;

      expect(imageSet.findImage('/assets/items/test.png')).toBeNull();
      expect(imageSet.size).toBe(0);
      maskResponse.resolve(new Response(null, { status:404 }));
      const asset = await loading;
      expect(imageSet.findImage('/assets/items/test.png')).toBe(asset);
    });

    it('loads the primary image when its optional mask is missing', async () => {
      vi.mocked(fetch).mockImplementation(async url => new Response(new Blob(), {
        status:String(url).endsWith('.punch.png') ? 404 : 200
      }));
      const imageSet = new ImageSet();

      const asset = await imageSet.loadImage('/assets/items/test.png', true);

      expect(asset.punchMaskImage).toBeNull();
      expect(imageSet.size).toBe(1);
    });

    it('ignores a non-image sidecar response without decoding it', async () => {
      vi.mocked(fetch).mockImplementation(async () => new Response(new Blob(), {
        headers:{ 'content-type':'text/html' }
      }));
      const imageSet = new ImageSet();

      const asset = await imageSet.loadImage('/assets/items/test.png', true);

      expect(asset.punchMaskImage).toBeNull();
      expect(createImageBitmap).toHaveBeenCalledTimes(1);
    });

    it('ignores an undecodable optional mask', async () => {
      vi.mocked(createImageBitmap).mockResolvedValueOnce({ width:2, height:1 } as ImageBitmap)
        .mockRejectedValueOnce(new Error('Mask decode failed'));
      const imageSet = new ImageSet();

      const asset = await imageSet.loadImage('/assets/items/test.png', true);

      expect(asset.punchMaskImage).toBeNull();
      expect(imageSet.size).toBe(1);
    });

    it('ignores an optional mask network failure', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(new Blob()))
        .mockRejectedValueOnce(new Error('Mask network failed'));
      const imageSet = new ImageSet();

      const asset = await imageSet.loadImage('/assets/items/test.png', true);

      expect(asset.punchMaskImage).toBeNull();
      expect(imageSet.size).toBe(1);
    });

    it('does not probe sidecars for non-PNG images', async () => {
      const imageSet = new ImageSet();

      const asset = await imageSet.loadImage('/assets/items/test.jpg', true);

      expect(asset.punchMaskImage).toBeNull();
      expect(fetch).toHaveBeenCalledExactlyOnceWith('/castle-mystery/assets/items/test.jpg');
    });

    it('asserts before starting I/O for an already registered URL', async () => {
      const imageSet = new ImageSet();
      const asset = await imageSet.loadImage('/assets/items/test.png');
      vi.mocked(fetch).mockClear();

      await expect(imageSet.loadImage('/assets/items/test.png', true))
        .rejects.toThrow('Image asset already loaded /assets/items/test.png');
      expect(fetch).not.toHaveBeenCalled();
      expect(imageSet.findImage('/assets/items/test.png')).toBe(asset);
    });

    it('allows concurrent duplicates with the last completed registration winning', async () => {
      const firstResponse = Promise.withResolvers<Response>();
      const secondResponse = Promise.withResolvers<Response>();
      vi.mocked(fetch).mockReturnValueOnce(firstResponse.promise).mockReturnValueOnce(secondResponse.promise);
      const firstImage = { width:2, height:1, close:vi.fn() } as unknown as ImageBitmap;
      const secondImage = { width:2, height:1, close:vi.fn() } as unknown as ImageBitmap;
      vi.mocked(createImageBitmap).mockResolvedValueOnce(secondImage).mockResolvedValueOnce(firstImage);
      const imageSet = new ImageSet();
      const firstLoading = imageSet.loadImage('/assets/items/test.png');
      const secondLoading = imageSet.loadImage('/assets/items/test.png');

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(imageSet.size).toBe(0);
      secondResponse.resolve(new Response(new Blob()));
      const secondAsset = await secondLoading;
      expect(imageSet.findImage('/assets/items/test.png')).toBe(secondAsset);
      firstResponse.resolve(new Response(new Blob()));
      const firstAsset = await firstLoading;
      expect(imageSet.findImage('/assets/items/test.png')).toBe(firstAsset);
      expect(firstAsset.image).toBe(firstImage);
      expect(secondAsset.image).toBe(secondImage);
      expect(imageSet.size).toBe(1);
      expect(firstImage.close).not.toHaveBeenCalled();
      expect(secondImage.close).not.toHaveBeenCalled();
    });
  });
});