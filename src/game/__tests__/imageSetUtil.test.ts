// Follow test conventions from CONTRIBUTING.md when editing this file.
import { afterEach, describe, expect, it, vi } from 'vitest';

import backgroundImageText from './fixtures/background-image.md?raw';
import imageSetReferencedImagesText from './fixtures/image-set-referenced-images.md?raw';
import itemImageText from './fixtures/item-image.md?raw';
import roomBackWallTextureText from './fixtures/room-back-wall-texture.md?raw';
import roomFloorTextureText from './fixtures/room-floor-texture.md?raw';
import roomRightWallTextureText from './fixtures/room-right-wall-texture.md?raw';
import { loadLevelFromText } from '@/levelLoading/levelUtil';
import { UNKNOWN_ITEM_ICON_URL } from '../discoveryIconUrlUtil';
import { createImageSetFromLevel } from '../imageSetUtil';
import { getBackgroundImageAssetUrl, getClozeImageCandidateUrls, getFaceImageAssetUrl, getGroundImageAssetUrl, getItemImageAssetUrl, getRoomTextureAssetUrl } from '../imageUrlUtil';

describe('imageSetUtil.ts', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('loads unique image URLs referenced by characters and resolves cloze statement image candidates in order', async () => {
    const fetchMock = vi.fn(async (url:string) => url.includes('/assets/conclusions/')
      ? { ok:false, blob:async () => new Blob([]) }
      : { ok:true, blob:async () => new Blob(['fake']) });
    const createImageBitmapMock = vi.fn(async () => ({ width:32, height:32 } as ImageBitmap));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('createImageBitmap', createImageBitmapMock);
    vi.stubGlobal('window', { location:{ pathname:'/castle-mystery/' } });

    const level = loadLevelFromText(imageSetReferencedImagesText);
    const imageSet = await createImageSetFromLevel(level);

    expect(fetchMock).toHaveBeenCalledTimes(6);
    expect(imageSet.has(getGroundImageAssetUrl())).toBe(true);
    expect(imageSet.has('/assets/sprites/key.png')).toBe(true);
    expect(imageSet.has(UNKNOWN_ITEM_ICON_URL)).toBe(true);
    expect(imageSet.has(getFaceImageAssetUrl('kingFace.png'))).toBe(true);
    expect(imageSet.has(getFaceImageAssetUrl('queenFace.png'))).toBe(true);
    expect(imageSet.has(getClozeImageCandidateUrls('queenFace.png')[0])).toBe(false);
    expect((level.conclusions[0].parts[0] as { imageUrl:string }).imageUrl).toBe(getFaceImageAssetUrl('queenFace.png'));
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

    expect(imageSet.has(getFaceImageAssetUrl('kingFace.png'))).toBe(true);
    expect(imageSet.has(getFaceImageAssetUrl('queenFace.png'))).toBe(false);
    expect((level.conclusions[0].parts[0] as { imageUrl:string[] }).imageUrl).toEqual(getClozeImageCandidateUrls('queenFace.png'));
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

  it('loads the optional level background image from the backgrounds directory', async () => {
    const fetchMock = vi.fn(async () => ({ ok:true, blob:async () => new Blob(['fake']) }));
    const createImageBitmapMock = vi.fn(async () => ({ width:320, height:180 } as ImageBitmap));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('createImageBitmap', createImageBitmapMock);
    vi.stubGlobal('window', { location:{ pathname:'/castle-mystery/' } });

    const level = loadLevelFromText(backgroundImageText, 'background-image.md');
    const imageSet = await createImageSetFromLevel(level);

    expect(fetchMock).toHaveBeenCalledWith('/castle-mystery/assets/sprites/key.png');
    expect(fetchMock).toHaveBeenCalledWith('/castle-mystery/assets/backgrounds/ground.png');
    expect(fetchMock).toHaveBeenCalledWith('/castle-mystery/assets/backgrounds/castle-sky.png');
    expect(imageSet.has(getGroundImageAssetUrl())).toBe(true);
    expect(imageSet.has(getBackgroundImageAssetUrl('castle-sky.png'))).toBe(true);
  });

  it('loads item images from the items directory', async () => {
    const fetchMock = vi.fn(async () => ({ ok:true, blob:async () => new Blob(['fake']) }));
    const createImageBitmapMock = vi.fn(async () => ({ width:64, height:32 } as ImageBitmap));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('createImageBitmap', createImageBitmapMock);
    vi.stubGlobal('window', { location:{ pathname:'/castle-mystery/' } });

    const level = loadLevelFromText(itemImageText, 'item-image.md');
    const imageSet = await createImageSetFromLevel(level);

    expect(fetchMock).toHaveBeenCalledWith('/castle-mystery/assets/sprites/key.png');
    expect(fetchMock).toHaveBeenCalledWith('/castle-mystery/assets/backgrounds/ground.png');
    expect(fetchMock).toHaveBeenCalledWith('/castle-mystery/assets/items/crown.png');
    expect(imageSet.has(getItemImageAssetUrl('crown.png'))).toBe(true);
  });

  it('loads referenced room back wall textures from the room directory', async () => {
    const fetchMock = vi.fn(async () => ({ ok:true, blob:async () => new Blob(['fake']) }));
    const createImageBitmapMock = vi.fn(async () => ({ width:64, height:64 } as ImageBitmap));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('createImageBitmap', createImageBitmapMock);
    vi.stubGlobal('window', { location:{ pathname:'/castle-mystery/' } });

    const level = loadLevelFromText(roomBackWallTextureText, 'room-texture-image.md');
    const imageSet = await createImageSetFromLevel(level);

    expect(fetchMock).toHaveBeenCalledWith('/castle-mystery/assets/room/greyBricks.png');
    expect(imageSet.has(getRoomTextureAssetUrl('greyBricks.png'))).toBe(true);
  });

  it('loads referenced room floor textures from the room directory', async () => {
    const fetchMock = vi.fn(async () => ({ ok:true, blob:async () => new Blob(['fake']) }));
    const createImageBitmapMock = vi.fn(async () => ({ width:64, height:64 } as ImageBitmap));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('createImageBitmap', createImageBitmapMock);
    vi.stubGlobal('window', { location:{ pathname:'/castle-mystery/' } });

    const level = loadLevelFromText(roomFloorTextureText, 'room-floor-texture.md');
    const imageSet = await createImageSetFromLevel(level);

    expect(fetchMock).toHaveBeenCalledWith('/castle-mystery/assets/room/floorBricks.png');
    expect(imageSet.has(getRoomTextureAssetUrl('floorBricks.png'))).toBe(true);
  });

  it('loads referenced room right wall textures from the room directory', async () => {
    const fetchMock = vi.fn(async () => ({ ok:true, blob:async () => new Blob(['fake']) }));
    const createImageBitmapMock = vi.fn(async () => ({ width:64, height:64 } as ImageBitmap));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('createImageBitmap', createImageBitmapMock);
    vi.stubGlobal('window', { location:{ pathname:'/castle-mystery/' } });

    const level = loadLevelFromText(roomRightWallTextureText, 'room-right-wall-texture.md');
    const imageSet = await createImageSetFromLevel(level);

    expect(fetchMock).toHaveBeenCalledWith('/castle-mystery/assets/room/wallBricks.png');
    expect(imageSet.has(getRoomTextureAssetUrl('wallBricks.png'))).toBe(true);
  });
});