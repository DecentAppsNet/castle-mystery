import { afterEach, describe, expect, it, vi } from 'vitest';
import bookText from './fixtures/book.md?raw';
import { addLevelChapterToBook, loadBookFromText, loadBookFromUrl } from '../bookContentUtil';
import { loadValidLevelForTest } from '@/levelLoading/__tests__/testLevelUtil';
import levelText from '@/game/__tests__/fixtures/save-state.md?raw';

afterEach(() => vi.unstubAllGlobals());

describe('bookContentUtil', () => {
  it('creates out-of-order chapters with identical titles and deduplicates revisits by URL', () => {
    const book = loadBookFromText(bookText);
    const level = loadValidLevelForTest(levelText);
    const [firstUrl, secondUrl] = book.levelUrls;
    addLevelChapterToBook(book, level, secondUrl);
    addLevelChapterToBook(book, level, firstUrl);
    const pageNo = book.pageNo;
    const pageCount = book.pages.length;
    const pieceCount = book.pieceStack.length;
    addLevelChapterToBook(book, { ...level, title:'Changed title' }, secondUrl);

    expect(book.pages.filter(page => page.kind === 'chapterStart')).toMatchObject([
      { chapterNo:1, title:level.title, levelUrl:secondUrl },
      { chapterNo:2, title:level.title, levelUrl:firstUrl }
    ]);
    expect(book.pages).toHaveLength(pageCount);
    expect(book.pieceStack).toHaveLength(pieceCount);
    expect(book.pageNo).toBe(pageNo);
    expect(book.pages.find(page => page.kind === 'conclusion')).toMatchObject({ levelUrl:secondUrl });
    expect(book.pages.at(-1)).toMatchObject({ kind:'chapterEnd', levelUrl:firstUrl });
  });
  it('loads authored metadata and preserves level order without creating chapters', () => {
    const book = loadBookFromText(bookText);
    expect(book.pages).toHaveLength(2);
    expect(book.pages[1]).toMatchObject({ kind:'bookStart', title:'Frederick and the Freemasons', subtitle:null, author:'Erik Hermansen' });
    expect(book.levelUrls).toEqual(['01_birth_of_constantine.md', '02_house_of_rocks.md',
      '03_black_brick.md', '04_inefficient_court.md', '05_fledgling_fraternity.md']);
    expect(book.pieceStack).toEqual([]);
  });

  it('defaults a missing author', () => {
    expect(loadBookFromText(bookText.replace('* author=Erik Hermansen', '')).pages[1])
      .toMatchObject({ author:'Unknown Author' });
  });

  it('parses an authored subtitle and escaped line breaks', () => {
    expect(loadBookFromText(bookText.replace('* author=Erik Hermansen', '* subtitle=First\\nSecond')).pages[1])
      .toMatchObject({ subtitle:'First\nSecond' });
  });

  it('rejects a missing title or missing levels', () => {
    expect(() => loadBookFromText(bookText.replace('* title=Frederick and the Freemasons', ''))).toThrow('title');
    expect(() => loadBookFromText(bookText.slice(0, bookText.indexOf('# levels')))).toThrow('level URLs');
  });

  it('rejects duplicate metadata', () => {
    expect(() => loadBookFromText(bookText.replace('* author=Erik Hermansen', '* title=Another'))).toThrow('duplicate');
  });

  it('fetches the book and resolves relative level URLs against its directory', async () => {
    vi.stubGlobal('window', { location:{ pathname:'/' } });
    const fetchMock = vi.fn().mockResolvedValue(new Response(bookText));
    vi.stubGlobal('fetch', fetchMock);
    const book = await loadBookFromUrl('/levels/book.md');
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(book.levelUrls[0]).toBe('/levels/01_birth_of_constantine.md');
  });

  it('rejects unsuccessful HTTP responses', async () => {
    vi.stubGlobal('window', { location:{ pathname:'/' } });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status:404 })));
    await expect(loadBookFromUrl('/levels/book.md')).rejects.toThrow('HTTP 404');
  });
});