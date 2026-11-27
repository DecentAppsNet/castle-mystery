import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addLevelChapterToBook, findBookImageUrls } from '@/book';
import { stubOffscreenCanvas } from '@/game/test/stubOffscreenCanvas';
import { ImageSet } from '@/imageLoading';
import levelText from '@/levelLoading/__tests__/fixtures/default-level.md?raw';
import snapshotText from '@/persistence/__tests__/fixtures/bookSaveState.json?raw';
import { pathStoreMock } from '@/persistence/__tests__/pathStoreMock';
import { getBookSaveState, setBookSaveState } from '@/persistence/bookSaveState';
import { setLastLevelUrl } from '@/persistence/lastLevel';
import BookSaveState from '@/persistence/types/BookSaveState';
import { init } from '../interactions/initialization';
import { acceptPreparedLevelState } from '../levelPreparation';
import bookText from './fixtures/startupBook.md?raw';

vi.mock('@/persistence/pathStore', async () => {
  const { pathStoreMock } = await import('@/persistence/__tests__/pathStoreMock');
  return pathStoreMock;
});

const bookUrl = '/levels/book.md';
const firstLevelUrl = '/levels/first.md';
const secondLevelUrl = '/levels/second.md';
const imageUrl = '/assets/conclusions/key.png';
const unrelatedImageUrl = '/assets/conclusions/unused.png';
const appPath = '/castle-mystery';
const save = JSON.parse(snapshotText.replace('/assets/items/key.png', imageUrl)) as BookSaveState;

function _mockFetch(url:string):Response {
  if (url === appPath + bookUrl) return new Response(bookText);
  if (url === appPath + firstLevelUrl || url === appPath + secondLevelUrl) return new Response(levelText);
  if (url === appPath + imageUrl || url === appPath + unrelatedImageUrl) return new Response(new Blob());
  return new Response(null, { status:404 });
}

describe('startup book restoration', () => {
  beforeEach(() => {
    pathStoreMock.reset();
    stubOffscreenCanvas();
    vi.stubGlobal('window', { location:{ pathname:`${appPath}/` } });
    vi.stubGlobal('fetch', vi.fn(async (url:string) => _mockFetch(url)));
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width:1, height:1, close:vi.fn() })));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('loads the selected level without fetching the authored book or replaying earlier levels', async () => {
    await setBookSaveState(bookUrl, save);
    await setLastLevelUrl(secondLevelUrl);
    const imageSet = new ImageSet();
    await imageSet.loadImage(unrelatedImageUrl);
    vi.mocked(fetch).mockClear();

    const prepared = await init(imageSet);
    expect(prepared).toMatchObject({ bookUrl, bookLoadKind:'restored', levelUrl:secondLevelUrl });
    expect(prepared.bookState.pageNo).toBe(save.pageNo);
    expect(prepared.bookState.isVisible).toBe(false);
    expect(vi.mocked(fetch).mock.calls.map(([url]) => url)).toEqual([
      appPath + secondLevelUrl, appPath + imageUrl, appPath + '/assets/conclusions/key.punch.png'
    ]);
    const restoredImage = imageSet.findImage(imageUrl);
    expect(restoredImage).not.toBeNull();
    acceptPreparedLevelState(prepared, findBookImageUrls(prepared.bookState));
    expect(imageSet.findImage(imageUrl)).toBe(restoredImage);
    expect(imageSet.findImage(unrelatedImageUrl)).toBeNull();
  });

  it('keeps the saved page when startup revisits an existing chapter', async () => {
    await setBookSaveState(bookUrl, save);
    const prepared = await init(new ImageSet());
    const reportStorageError = vi.fn();
    addLevelChapterToBook(prepared.bookState, prepared.level, prepared.levelUrl, reportStorageError);
    expect(prepared.levelUrl).toBe(firstLevelUrl);
    expect(prepared.bookState.pageNo).toBe(save.pageNo);
    expect(prepared.bookState.pages).toHaveLength(save.pages.length);
    expect(reportStorageError).not.toHaveBeenCalled();
  });

  it('loads a fresh authored book when there is no snapshot', async () => {
    const result = await init(new ImageSet());
    expect(result).toMatchObject({ bookUrl, bookLoadKind:'fresh', levelUrl:firstLevelUrl });
    expect(result.bookState.levelUrls).toEqual([firstLevelUrl, secondLevelUrl]);
  });

  it('falls back to authored pages when the snapshot has an invalid page reference', async () => {
    await setBookSaveState(bookUrl, { ...save, pageNo:999 });
    const result = await init(new ImageSet());
    expect(result.bookLoadKind).toBe('fresh');
    expect(result.bookState.pages).toHaveLength(2);
    expect(result.bookState.pieceStack).toEqual([]);
  });

  it('protects an unsupported version while loading the authored book', async () => {
    pathStoreMock.getText.mockResolvedValueOnce(JSON.stringify({ version:2 }));
    const result = await init(new ImageSet());
    expect(result).toMatchObject({ bookUrl, bookLoadKind:'unsupportedVersion', levelUrl:firstLevelUrl });
    expect(pathStoreMock.setText).not.toHaveBeenCalled();
    expect(pathStoreMock.deleteByKey).not.toHaveBeenCalled();
  });

  it('surfaces a stored image fetch failure without discarding the save', async () => {
    await setBookSaveState(bookUrl, save);
    vi.mocked(fetch).mockImplementation(async url => url === appPath + imageUrl
      ? new Response(null, { status:404 }) : _mockFetch(String(url)));
    await expect(init(new ImageSet())).rejects.toThrow(`Could not load image ${imageUrl}`);
    expect(fetch).not.toHaveBeenCalledWith(appPath + bookUrl);
    await expect(getBookSaveState(bookUrl)).resolves.toEqual({ kind:'found', saveState:save });
  });

  it('surfaces a book storage read failure without fetching fallback content', async () => {
    pathStoreMock.getText.mockRejectedValueOnce(new Error('Storage unavailable'));
    await expect(init(new ImageSet())).rejects.toThrow('Unable to read the book save');
    expect(fetch).not.toHaveBeenCalled();
  });
});