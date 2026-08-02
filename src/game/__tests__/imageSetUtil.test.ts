// Follow test conventions from CONTRIBUTING.md when editing this file.
import { afterEach, describe, expect, it, vi } from 'vitest';

import backgroundImageText from './fixtures/background-image.md?raw';
import becomesItemText from '../integration-tests/fixtures/becomes-item.md?raw';
import imageSetReferencedImagesText from './fixtures/image-set-referenced-images.md?raw';
import itemImageText from './fixtures/item-image.md?raw';
import roomBackWallTextureText from './fixtures/room-back-wall-texture.md?raw';
import roomFloorTextureText from './fixtures/room-floor-texture.md?raw';
import roomRightWallTextureText from './fixtures/room-right-wall-texture.md?raw';
import roomStairTextureText from './fixtures/room-stair-texture.md?raw';
import roomDoorTextureText from './fixtures/room-door-texture.md?raw';
import multiImageRoomTextureText from './fixtures/multi-image-room-texture.md?raw';
import { loadLevelFromText } from '@/levelLoading/levelUtil';
import { createBecomesCharacterEvent, createBecomesItemEvent, createInitialPoseEventFromUnpairedCharacter, createItineraryIndex } from '../itineraryUtil';
import { UNKNOWN_ITEM_ICON_URL } from '../discoveryIconUrlUtil';
import { createImageSetFromLevel } from '../imageSetUtil';
import { getBackgroundImageAssetUrl, getClozeImageCandidateUrls, getFaceImageAssetUrl, getGroundImageAssetUrl, getItemImageAssetUrl, getRoomTextureAssetUrl } from '../imageUrlUtil';
import Character, { createDefaultCharacter } from '../types/Character';
import { createDefaultLevel } from '../types/Level';
import { createDefaultItem } from '../types/Item';

function _createCharacterWithSeededItinerary(baseCharacter:Character, itinerary:Character['itinerary']):Character {
  const seededItinerary = [createInitialPoseEventFromUnpairedCharacter(baseCharacter), ...itinerary];
  return {
    ...baseCharacter,
    itinerary:seededItinerary,
    itineraryIndex:createItineraryIndex(seededItinerary, baseCharacter.position, baseCharacter.id)
  };
}

function _createReplacementTargetItemImageLevel() {
  const chisel = {
    ...createDefaultItem(),
    id:'chisel',
    title:'Chisel',
    imageUrl:'/assets/items/chisel.png'
  };
  const brassKey = {
    ...createDefaultItem(),
    id:'brass key',
    title:'Brass Key',
    imageUrl:'/assets/items/brassKey.png'
  };
  const niccoloBase = {
    ...createDefaultCharacter(),
    id:'niccolo',
    title:'Niccolo',
    items:[chisel]
  };
  const niccolo = _createCharacterWithSeededItinerary(niccoloBase, [createBecomesCharacterEvent(1_000, 'niccolo', 'niccolo masked')]);
  const niccoloMaskedBase = {
    ...createDefaultCharacter(),
    id:'niccolo masked',
    title:'Niccolo Masked'
  };
  const niccoloMasked = _createCharacterWithSeededItinerary(niccoloMaskedBase, [createBecomesItemEvent(1_001, 'chisel', 'brass key')]);

  return {
    ...createDefaultLevel(),
    activeCharacterId:'niccolo',
    initialCharacters:[niccolo],
    characters:[niccolo],
    allCharactersById:new Map([
      ['niccolo', niccolo],
      ['niccolo masked', niccoloMasked]
    ]),
    itemsById:new Map([
      ['chisel', chisel],
      ['brass key', brassKey]
    ])
  };
}

function _createReplacementTargetFaceImageLevel() {
  const niccolo = _createCharacterWithSeededItinerary({
    ...createDefaultCharacter(),
    id:'niccolo',
    title:'Niccolo',
    faceImageUrl:'/assets/faces/niccoloFace.png'
  }, [createBecomesCharacterEvent(7_000, 'niccolo', 'niccolo masked')]);
  const niccoloMasked = _createCharacterWithSeededItinerary({
    ...createDefaultCharacter(),
    id:'niccolo masked',
    title:'Niccolo Masked',
    faceImageUrl:'/assets/faces/niccoloMaskedFace.png'
  }, []);
  const bystander = _createCharacterWithSeededItinerary({
    ...createDefaultCharacter(),
    id:'bystander',
    title:'Bystander',
    faceImageUrl:'/assets/faces/bystanderFace.png'
  }, []);

  return {
    ...createDefaultLevel(),
    activeCharacterId:'niccolo',
    initialCharacters:[niccolo],
    characters:[niccolo],
    allCharactersById:new Map([
      ['niccolo', niccolo],
      ['niccolo masked', niccoloMasked],
      ['bystander', bystander]
    ])
  };
}

describe('imageSetUtil.ts', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it.skip('loads unique image URLs referenced by characters and resolves cloze statement image candidates in order', async () => {
    const fetchMock = vi.fn(async (url:string) => url.includes('/assets/conclusions/')
      ? { ok:false, blob:async () => new Blob([]) }
      : { ok:true, blob:async () => new Blob(['fake']) });
    const createImageBitmapMock = vi.fn(async () => ({ width:32, height:32 } as ImageBitmap));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('createImageBitmap', createImageBitmapMock);
    vi.stubGlobal('window', { location:{ pathname:'/castle-mystery/' } });

    const level = loadLevelFromText(imageSetReferencedImagesText);
    const imageSet = await createImageSetFromLevel(level);

    expect(imageSet.has(getGroundImageAssetUrl())).toBe(true);
    expect(imageSet.has('/assets/sprites/key.png')).toBe(true);
    expect(imageSet.has(UNKNOWN_ITEM_ICON_URL)).toBe(true);
    expect(imageSet.has(getFaceImageAssetUrl('kingFace.png'))).toBe(true);
    expect(imageSet.has(getFaceImageAssetUrl('queenFace.png'))).toBe(true);
    expect(imageSet.has(getClozeImageCandidateUrls('queenFace.png')[0])).toBe(false);
    expect((level.conclusions[0].parts[0] as { imageUrl:string }).imageUrl).toBe(getFaceImageAssetUrl('queenFace.png'));
  });

  it.skip('loads face images for character replacement targets without loading every declared imported character', async () => {
    const fetchMock = vi.fn(async () => ({ ok:true, blob:async () => new Blob(['fake']) }));
    const createImageBitmapMock = vi.fn(async () => ({ width:32, height:32 } as ImageBitmap));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('createImageBitmap', createImageBitmapMock);
    vi.stubGlobal('window', { location:{ pathname:'/castle-mystery/' } });

    const level = _createReplacementTargetFaceImageLevel();
    const imageSet = await createImageSetFromLevel(level);

    expect(imageSet.has(getFaceImageAssetUrl('niccoloFace.png'))).toBe(true);
    expect(imageSet.has(getFaceImageAssetUrl('niccoloMaskedFace.png'))).toBe(true);
    expect(imageSet.has(getFaceImageAssetUrl('bystanderFace.png'))).toBe(false);
  });

  it.skip('loads an optional .punch.png sidecar into the image asset when present', async () => {
    const baseImageBitmap = { width:64, height:64 } as ImageBitmap;
    const punchMaskImageBitmap = { width:64, height:64 } as ImageBitmap;
    const fetchMock = vi.fn(async (url:string) => url.endsWith('.punch.png')
      ? {
        ok:true,
        headers:{ get:() => 'image/png' },
        blob:async () => new Blob(['mask'])
      }
      : {
        ok:true,
        headers:{ get:() => 'image/png' },
        blob:async () => new Blob(['fake'])
      });
    const createImageBitmapMock = vi.fn(async (_blob:Blob) => createImageBitmapMock.mock.calls.length === 1
      ? baseImageBitmap
      : punchMaskImageBitmap);
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('createImageBitmap', createImageBitmapMock);
    vi.stubGlobal('window', { location:{ pathname:'/castle-mystery/' } });

    const level = loadLevelFromText(roomBackWallTextureText, 'room-texture-image.md');
    const imageSet = await createImageSetFromLevel(level);
    const imageAsset = imageSet.get(getRoomTextureAssetUrl('greyBricks.png')) || null;

    expect(fetchMock).toHaveBeenCalledWith('/castle-mystery/assets/room/greyBricks.punch.png');
    expect(imageAsset?.punchMaskImage).toBe(punchMaskImageBitmap);
  });

  it.skip('treats a missing .punch.png sidecar as absent without blocking the main image load', async () => {
    const fetchMock = vi.fn(async (url:string) => url.endsWith('.punch.png')
      ? {
        ok:false,
        headers:{ get:() => null },
        blob:async () => new Blob([])
      }
      : {
        ok:true,
        headers:{ get:() => 'image/png' },
        blob:async () => new Blob(['fake'])
      });
    const createImageBitmapMock = vi.fn(async () => ({ width:64, height:64 } as ImageBitmap));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('createImageBitmap', createImageBitmapMock);
    vi.stubGlobal('window', { location:{ pathname:'/castle-mystery/' } });

    const level = loadLevelFromText(roomBackWallTextureText, 'room-texture-image.md');
    const imageSet = await createImageSetFromLevel(level);
    const imageAsset = imageSet.get(getRoomTextureAssetUrl('greyBricks.png')) || null;

    expect(imageAsset?.image).toEqual({ width:64, height:64 });
    expect(imageAsset?.punchMaskImage).toBeNull();
  });

  it.skip('omits image URLs whose fetch returns a non-OK response', async () => {
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

  it.skip('omits image URLs whose body fails to decode', async () => {
    const fetchMock = vi.fn(async () => ({ ok:true, blob:async () => new Blob(['<html>not an image</html>']) }));
    const createImageBitmapMock = vi.fn(async () => { throw new Error('InvalidStateError: The source image could not be decoded.'); });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('createImageBitmap', createImageBitmapMock);
    vi.stubGlobal('window', { location:{ pathname:'/castle-mystery/' } });

    const level = loadLevelFromText(imageSetReferencedImagesText);
    const imageSet = await createImageSetFromLevel(level);

    expect(imageSet.size).toBe(0);
  });

  it.skip('returns an empty image set when createImageBitmap is unavailable', async () => {
    const fetchMock = vi.fn(async () => ({ ok:true, blob:async () => new Blob(['fake']) }));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('createImageBitmap', undefined);
    vi.stubGlobal('window', { location:{ pathname:'/castle-mystery/' } });

    const level = loadLevelFromText(imageSetReferencedImagesText);
    const imageSet = await createImageSetFromLevel(level);

    expect(imageSet.size).toBe(0);
  });

  it.skip('loads the optional level background image from the backgrounds directory', async () => {
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

  it.skip('loads item images from the items directory', async () => {
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

  it.skip('loads images for unplaced items referenced only as becomes targets', async () => {
    const fetchMock = vi.fn(async () => ({ ok:true, blob:async () => new Blob(['fake']) }));
    const createImageBitmapMock = vi.fn(async () => ({ width:64, height:32 } as ImageBitmap));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('createImageBitmap', createImageBitmapMock);
    vi.stubGlobal('window', { location:{ pathname:'/castle-mystery/' } });

    const level = loadLevelFromText(becomesItemText, 'becomes-item.md');
    const imageSet = await createImageSetFromLevel(level);

    expect(fetchMock).toHaveBeenCalledWith('/castle-mystery/assets/items/chisel.png');
    expect(fetchMock).toHaveBeenCalledWith('/castle-mystery/assets/items/brassKey.png');
    expect(imageSet.has(getItemImageAssetUrl('chisel.png'))).toBe(true);
    expect(imageSet.has(getItemImageAssetUrl('brassKey.png'))).toBe(true);
  });

  it.skip('loads becomes-target item images authored only on a replacement target itinerary', async () => {
    const fetchMock = vi.fn(async () => ({ ok:true, blob:async () => new Blob(['fake']) }));
    const createImageBitmapMock = vi.fn(async () => ({ width:64, height:32 } as ImageBitmap));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('createImageBitmap', createImageBitmapMock);
    vi.stubGlobal('window', { location:{ pathname:'/castle-mystery/' } });

    const level = _createReplacementTargetItemImageLevel();
    const imageSet = await createImageSetFromLevel(level);

    expect(fetchMock).toHaveBeenCalledWith('/castle-mystery/assets/items/chisel.png');
    expect(fetchMock).toHaveBeenCalledWith('/castle-mystery/assets/items/brassKey.png');
    expect(imageSet.has(getItemImageAssetUrl('chisel.png'))).toBe(true);
    expect(imageSet.has(getItemImageAssetUrl('brassKey.png'))).toBe(true);
  });

  it.skip('loads referenced room back wall textures from the room directory', async () => {
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

  it.skip('loads referenced room floor textures from the room directory', async () => {
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

  it.skip('loads referenced room right wall textures from the room directory', async () => {
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

  it.skip('loads referenced room stair textures from the room directory', async () => {
    const fetchMock = vi.fn(async () => ({ ok:true, blob:async () => new Blob(['fake']) }));
    const createImageBitmapMock = vi.fn(async () => ({ width:64, height:64 } as ImageBitmap));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('createImageBitmap', createImageBitmapMock);
    vi.stubGlobal('window', { location:{ pathname:'/castle-mystery/' } });

    const level = loadLevelFromText(roomStairTextureText, 'room-stair-texture.md');
    const imageSet = await createImageSetFromLevel(level);

    expect(fetchMock).toHaveBeenCalledWith('/castle-mystery/assets/room/greyBricks.png');
    expect(fetchMock).toHaveBeenCalledWith('/castle-mystery/assets/room/floorBricks.png');
    expect(imageSet.has(getRoomTextureAssetUrl('greyBricks.png'))).toBe(true);
    expect(imageSet.has(getRoomTextureAssetUrl('floorBricks.png'))).toBe(true);
  });

  it.skip('loads referenced room door textures from the room directory', async () => {
    const fetchMock = vi.fn(async () => ({ ok:true, blob:async () => new Blob(['fake']) }));
    const createImageBitmapMock = vi.fn(async () => ({ width:64, height:64 } as ImageBitmap));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('createImageBitmap', createImageBitmapMock);
    vi.stubGlobal('window', { location:{ pathname:'/castle-mystery/' } });

    const level = loadLevelFromText(roomDoorTextureText, 'room-door-texture.md');
    const imageSet = await createImageSetFromLevel(level);

    expect(fetchMock).toHaveBeenCalledWith('/castle-mystery/assets/room/greyBricks.png');
    expect(fetchMock).toHaveBeenCalledWith('/castle-mystery/assets/room/floorBricks.png');
    expect(imageSet.has(getRoomTextureAssetUrl('greyBricks.png'))).toBe(true);
    expect(imageSet.has(getRoomTextureAssetUrl('floorBricks.png'))).toBe(true);
  });

  it.skip('loads every image referenced by a multi-image room texture in authored order', async () => {
    const fetchMock = vi.fn(async () => ({ ok:true, blob:async () => new Blob(['fake']) }));
    const createImageBitmapMock = vi.fn(async () => ({ width:64, height:64 } as ImageBitmap));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('createImageBitmap', createImageBitmapMock);
    vi.stubGlobal('window', { location:{ pathname:'/castle-mystery/' } });

    const level = loadLevelFromText(multiImageRoomTextureText, 'multi-image-room-texture.md');
    const imageSet = await createImageSetFromLevel(level);

    expect(fetchMock).toHaveBeenCalledWith('/castle-mystery/assets/room/greyBricks.png');
    expect(fetchMock).toHaveBeenCalledWith('/castle-mystery/assets/room/threeArchedWindows.png');
    expect(imageSet.has(getRoomTextureAssetUrl('greyBricks.png'))).toBe(true);
    expect(imageSet.has(getRoomTextureAssetUrl('threeArchedWindows.png'))).toBe(true);
  });
});