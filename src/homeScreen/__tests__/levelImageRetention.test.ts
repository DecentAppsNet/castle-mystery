import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { acceptPreparedLevelState, prepareLevelState } from '../levelPreparation';
import { createImageSet, updateImageSetForLevel } from '@/game/imageSetUtil';
import { findBookImageUrls } from '@/book';
import { createDefaultBookState } from '@/book/types/BookState';
import { loadValidLevelForTest } from '@/levelLoading/__tests__/testLevelUtil';
import defaultText from '@/levelLoading/__tests__/fixtures/default-level.md?raw';
import { pathStoreMock } from '@/persistence/__tests__/pathStoreMock';
import { stubOffscreenCanvas } from '@/game/test/stubOffscreenCanvas';
import Conclusion from '@/game/conclusions/types/Conclusion';
import ClozePartType from '@/game/conclusions/types/ClozePartType';

vi.mock('@/persistence/pathStore', async () => {
  const { pathStoreMock } = await import('@/persistence/__tests__/pathStoreMock');
  return pathStoreMock;
});

const imageConclusion:Conclusion = {
  id:'test', title:'Test', parts:[{ type:ClozePartType.image, imageUrl:'/assets/conclusions/first.png' }],
  isComplete:false, isLocked:false, isOptional:false, incorrectGuessCount:0, unlockConclusionIds:[], revealRoomIds:[]
};

describe('level image retention', () => {
  beforeEach(() => {
    pathStoreMock.reset();
    stubOffscreenCanvas();
    vi.stubGlobal('window', { location:{ pathname:'/castle-mystery/' } });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Blob(), { headers:{ 'content-type':'image/png' } })));
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width:1, height:1, close:vi.fn() })));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('retains every permanent asset after accepting an image-free level', async () => {
    const imageSet = await createImageSet();
    const permanentAssets = vi.mocked(fetch).mock.calls
      .map(([url]) => String(url)).filter(url => !url.endsWith('.punch.png'))
      .map(url => {
        const imageUrl = url.slice('/castle-mystery'.length);
        return { imageUrl, asset:imageSet.findImage(imageUrl) };
      });
    expect(permanentAssets.length).toBeGreaterThan(0);
    const level = loadValidLevelForTest(defaultText);
    await updateImageSetForLevel(level, imageSet);
    const prepared = await prepareLevelState(level, imageSet, 'first.md');

    acceptPreparedLevelState(prepared, new Set());

    for (const { imageUrl, asset } of permanentAssets) {
      expect(asset).not.toBeNull();
      expect(imageSet.findImage(imageUrl)).toBe(asset);
      expect(asset?.image.close).not.toHaveBeenCalled();
      expect(asset?.punchMaskImage?.close).not.toHaveBeenCalled();
    }
  });

  it('retains active direct and resolved candidate images', async () => {
    const imageSet = await createImageSet();
    const level = { ...loadValidLevelForTest(defaultText), backgroundImageUrl:'/assets/backgrounds/active.png',
      conclusions:[{ ...imageConclusion, parts:[{ type:ClozePartType.image,
        imageUrl:['/assets/conclusions/active.png', '/assets/bodies/active.png'] }] }] };
    await updateImageSetForLevel(level, imageSet);
    const backgroundAsset = imageSet.findImage('/assets/backgrounds/active.png');
    const candidateAsset = imageSet.findImage('/assets/conclusions/active.png');
    expect(backgroundAsset).not.toBeNull();
    expect(candidateAsset).not.toBeNull();
    const prepared = await prepareLevelState(level, imageSet, 'active.md');

    acceptPreparedLevelState(prepared, new Set());

    expect(imageSet.findImage('/assets/backgrounds/active.png')).toBe(backgroundAsset);
    expect(imageSet.findImage('/assets/conclusions/active.png')).toBe(candidateAsset);
    expect(backgroundAsset?.image.close).not.toHaveBeenCalled();
    expect(candidateAsset?.image.close).not.toHaveBeenCalled();
  });

  it('retains old-level images only while current book content requires them', async () => {
    const imageSet = await createImageSet();
    const firstLevel = { ...loadValidLevelForTest(defaultText), conclusions:[imageConclusion] };
    await updateImageSetForLevel(firstLevel, imageSet);
    acceptPreparedLevelState(await prepareLevelState(firstLevel, imageSet, 'first.md'), new Set());
    const bookAsset = imageSet.findImage('/assets/conclusions/first.png');
    expect(bookAsset).not.toBeNull();
    const secondLevel = loadValidLevelForTest(defaultText);
    await updateImageSetForLevel(secondLevel, imageSet);
    const prepared = await prepareLevelState(secondLevel, imageSet, 'second.md');
    const bookState = createDefaultBookState();
    bookState.pages.push({ kind:'conclusion', headingText:'', chapterNo:1, conclusion:imageConclusion,
      answerSetIdToPieceStyleNoMap:{} });

    acceptPreparedLevelState(prepared, findBookImageUrls(bookState));

    expect(imageSet.findImage('/assets/conclusions/first.png')).toBe(bookAsset);
    expect(bookAsset?.image.close).not.toHaveBeenCalled();

    bookState.pages = [];
    acceptPreparedLevelState(prepared, findBookImageUrls(bookState));

    expect(imageSet.findImage('/assets/conclusions/first.png')).toBeNull();
    expect(bookAsset?.image.close).toHaveBeenCalledTimes(1);
  });

  it('preserves assets shared by permanent, level, and book demand without additional I/O', async () => {
    const imageSet = await createImageSet();
    const permanentUrl = String(vi.mocked(fetch).mock.calls[0][0]).slice('/castle-mystery'.length);
    const sharedAsset = imageSet.findImage(permanentUrl);
    expect(sharedAsset).not.toBeNull();
    const level = { ...loadValidLevelForTest(defaultText), backgroundImageUrl:permanentUrl };
    await updateImageSetForLevel(level, imageSet);
    const prepared = await prepareLevelState(level, imageSet, 'shared.md');
    vi.mocked(fetch).mockClear();
    vi.mocked(createImageBitmap).mockClear();

    acceptPreparedLevelState(prepared, new Set([permanentUrl]));

    expect(imageSet.findImage(permanentUrl)).toBe(sharedAsset);
    expect(sharedAsset?.image.close).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(createImageBitmap).not.toHaveBeenCalled();
  });

  it('removes and closes level-only assets after acceptance and reloads them on revisit', async () => {
    const imageSet = await createImageSet();
    const firstLevel = { ...loadValidLevelForTest(defaultText), backgroundImageUrl:'/assets/backgrounds/first.png' };
    await updateImageSetForLevel(firstLevel, imageSet);
    acceptPreparedLevelState(await prepareLevelState(firstLevel, imageSet, 'first.md'), new Set());
    const removedAsset = imageSet.findImage(firstLevel.backgroundImageUrl);
    expect(removedAsset).not.toBeNull();
    expect(removedAsset?.punchMaskImage).not.toBeNull();
    const secondLevel = loadValidLevelForTest(defaultText);
    await updateImageSetForLevel(secondLevel, imageSet);
    const prepared = await prepareLevelState(secondLevel, imageSet, 'second.md');
    expect(imageSet.findImage(firstLevel.backgroundImageUrl)).toBe(removedAsset);

    acceptPreparedLevelState(prepared, new Set());

    expect(imageSet.findImage(firstLevel.backgroundImageUrl)).toBeNull();
    expect(removedAsset?.image.close).toHaveBeenCalledTimes(1);
    expect(removedAsset?.punchMaskImage?.close).toHaveBeenCalledTimes(1);
    vi.mocked(fetch).mockClear();
    await updateImageSetForLevel(firstLevel, imageSet);
    expect(imageSet.findImage(firstLevel.backgroundImageUrl)).not.toBe(removedAsset);
    expect(imageSet.findImage(firstLevel.backgroundImageUrl)).not.toBeNull();
    expect(fetch).toHaveBeenCalledWith(`/castle-mystery${firstLevel.backgroundImageUrl}`);
  });

  it('does not prune outgoing assets when game-state preparation fails', async () => {
    const imageSet = await createImageSet();
    const outgoingAsset = await imageSet.loadImage('/assets/backgrounds/outgoing.png');
    const level = { ...loadValidLevelForTest(defaultText), activeCharacterId:'missing',
      backgroundImageUrl:'/assets/backgrounds/new.png' };
    await updateImageSetForLevel(level, imageSet);

    await expect(prepareLevelState(level, imageSet, 'invalid.md')).rejects.toThrow();

    expect(imageSet.findImage('/assets/backgrounds/outgoing.png')).toBe(outgoingAsset);
    expect(outgoingAsset.image.close).not.toHaveBeenCalled();
  });
});