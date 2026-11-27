import { describe, expect, it } from 'vitest';
import ChapterEndPage from '@/book/types/ChapterEndPage';
import ConclusionPage from '@/book/types/ConclusionPage';
import TallyPage from '@/book/types/TallyPage';
import { decodeBookPages, encodeBookPages } from '../bookPageSaveCodec';
import { savedBookPages } from './fixtures/savedBookPages';

function _decodeFixture() {
  const pages = decodeBookPages(savedBookPages);
  expect(pages).not.toBeNull();
  return pages!;
}

describe('bookPageSaveCodec', () => {
  it('round-trips an ordered book with several chapters through JSON', () => {
    const pages = _decodeFixture();
    const snapshot = encodeBookPages(pages);
    expect(snapshot).toEqual(savedBookPages);
    expect(decodeBookPages(JSON.parse(JSON.stringify(snapshot)))).toEqual(pages);
  });

  it('restores a book before any chapters have been added', () => {
    const cover = savedBookPages.slice(0, 2);
    expect(decodeBookPages(cover)).toEqual(cover);
  });

  it('links tally and end pages to their own chapter conclusions in page order', () => {
    const pages = _decodeFixture();
    const first = (pages[4] as ConclusionPage).conclusion;
    const second = (pages[6] as ConclusionPage).conclusion;
    const sameIdOtherChapter = (pages[12] as ConclusionPage).conclusion;
    const firstTally = pages[8] as TallyPage;
    const firstEnd = pages[9] as ChapterEndPage;
    expect(firstTally.conclusions[0]).toBe(first);
    expect(firstTally.conclusions[1]).toBe(second);
    expect(firstEnd.conclusions).toBe(firstTally.conclusions);
    expect(sameIdOtherChapter.id).toBe(first.id);
    expect(sameIdOtherChapter).not.toBe(first);
    expect((pages[14] as TallyPage).conclusions[0]).toBe(sameIdOtherChapter);
    expect((pages[15] as ChapterEndPage).conclusions[0]).toBe(sameIdOtherChapter);
  });

  it('restores a shared empty conclusion list for an empty chapter', () => {
    const pages = _decodeFixture();
    const tally = pages[18] as TallyPage;
    expect(tally.conclusions).toEqual([]);
    expect((pages[19] as ChapterEndPage).conclusions).toBe(tally.conclusions);
  });

  it('rejects a conclusion belonging to a different level URL', () => {
    const pages = [...savedBookPages];
    pages[4] = { ...(pages[4] as Extract<typeof pages[number], { kind:'conclusion' }>), levelUrl:'/other/first.md' };
    expect(decodeBookPages(pages)).toBeNull();
  });

  it('rejects a tally belonging to a different chapter number', () => {
    const pages = [...savedBookPages];
    pages[8] = { ...pages[8], chapterNo:2 };
    expect(decodeBookPages(pages)).toBeNull();
  });

  it('rejects a chapter missing its end page', () => {
    expect(decodeBookPages(savedBookPages.slice(0, -1))).toBeNull();
  });
});