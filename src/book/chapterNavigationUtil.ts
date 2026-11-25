/* This file resolves level destinations for chapter navigation controls.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import type BookPage from './types/BookPage';
import type BookState from './types/BookState';

function _findDifferentChapterUrl(page:BookPage|undefined, levelUrls:readonly string[], loadedLevelUrl:string):string|null {
  if (page?.kind !== 'chapterStart' && page?.kind !== 'chapterEnd') return null;
  const levelUrl = levelUrls[page.chapterNo - 1];
  return levelUrl && levelUrl !== loadedLevelUrl ? levelUrl : null;
}

export function findVisitChapterTarget(bookState:Readonly<BookState>, loadedLevelUrl:string|null) {
  const { layout, pageNo, pages, levelUrls } = bookState;
  if (!layout || !loadedLevelUrl) return null;
  const leftPageNo = pageNo % 2 === 1 ? pageNo : pageNo - 1;
  if (!layout.isSinglePageView || pageNo === leftPageNo) {
    const levelUrl = _findDifferentChapterUrl(pages[leftPageNo - 1], levelUrls, loadedLevelUrl);
    if (levelUrl) return { levelUrl, isLeftPage:true };
  }
  if (!layout.isSinglePageView || pageNo !== leftPageNo) {
    const levelUrl = _findDifferentChapterUrl(pages[leftPageNo], levelUrls, loadedLevelUrl);
    if (levelUrl) return { levelUrl, isLeftPage:false };
  }
  return null;
}