import { afterEach, describe, expect, it, vi } from 'vitest';

import imageSetReferencedImagesText from './fixtures/image-set-referenced-images.md?raw';
import { createImageSetFromLevel } from '../imageSetUtil';
import { loadLevelFromText } from '../levelLoading/levelUtil';

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

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(imageSet.has('/sprites/kingFace.png')).toBe(true);
    expect(imageSet.has('/sprites/queenFace.png')).toBe(true);
  });
});