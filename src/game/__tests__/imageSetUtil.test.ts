import { afterEach, describe, expect, it, vi } from 'vitest';

import imageSetReferencedImagesText from './fixtures/image-set-referenced-images.md?raw';
import { createImageSetFromLevel } from '../imageSetUtil';
import { loadLevelFromText } from '../../levelLoading/levelUtil';

describe('imageSetUtil.ts', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('loads unique image URLs referenced by characters and cloze statement image parts', async () => {
    const fetchMock = vi.fn(async () => ({ ok:true, blob:async () => new Blob(['fake']) }));
    const createImageBitmapMock = vi.fn(async () => ({ width:32, height:32 } as ImageBitmap));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('createImageBitmap', createImageBitmapMock);
    vi.stubGlobal('window', { location:{ pathname:'/castle-mystery/' } });

    const level = loadLevelFromText(imageSetReferencedImagesText);
    const imageSet = await createImageSetFromLevel(level);

    expect(fetchMock).toHaveBeenCalledTimes(7);
    expect(imageSet.has('/sprites/door.png')).toBe(true);
    expect(imageSet.has('/sprites/doorway.png')).toBe(true);
    expect(imageSet.has('/sprites/key.png')).toBe(true);
    expect(imageSet.has('/sprites/kingFace.png')).toBe(true);
    expect(imageSet.has('/sprites/lockableDoor.png')).toBe(true);
    expect(imageSet.has('/sprites/unknownDoor.png')).toBe(true);
    expect(imageSet.has('/sprites/queenFace.png')).toBe(true);
  });

  it('omits image URLs whose fetch returns a non-OK response', async () => {
    const fetchMock = vi.fn(async (url:string) => url.includes('queen')
      ? { ok:false, blob:async () => new Blob([]) }
      : { ok:true, blob:async () => new Blob(['fake']) });
    const createImageBitmapMock = vi.fn(async () => ({ width:32, height:32 } as ImageBitmap));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('createImageBitmap', createImageBitmapMock);
    vi.stubGlobal('window', { location:{ pathname:'/castle-mystery/' } });

    const level = loadLevelFromText(imageSetReferencedImagesText);
    const imageSet = await createImageSetFromLevel(level);

    expect(imageSet.has('/sprites/kingFace.png')).toBe(true);
    expect(imageSet.has('/sprites/queenFace.png')).toBe(false);
  });

  it('omits image URLs whose body fails to decode', async () => {
    const fetchMock = vi.fn(async () => ({ ok:true, blob:async () => new Blob(['<html>not an image</html>']) }));
    const createImageBitmapMock = vi.fn(async () => { throw new Error('InvalidStateError: The source image could not be decoded.'); });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('createImageBitmap', createImageBitmapMock);
    vi.stubGlobal('window', { location:{ pathname:'/castle-mystery/' } });

    const level = loadLevelFromText(imageSetReferencedImagesText);
    const imageSet = await createImageSetFromLevel(level);

    expect(imageSet.size).toBe(0);
  });

  it('returns an empty image set when createImageBitmap is unavailable', async () => {
    const fetchMock = vi.fn(async () => ({ ok:true, blob:async () => new Blob(['fake']) }));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('createImageBitmap', undefined);
    vi.stubGlobal('window', { location:{ pathname:'/castle-mystery/' } });

    const level = loadLevelFromText(imageSetReferencedImagesText);
    const imageSet = await createImageSetFromLevel(level);

    expect(imageSet.size).toBe(0);
  });
});