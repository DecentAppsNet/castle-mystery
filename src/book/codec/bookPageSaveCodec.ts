/* This file converts ordered book pages between runtime state and saved records.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import Conclusion from '@/conclusions/types/Conclusion';
import SavedBookPage from '@/persistence/types/SavedBookPage';
import { generateAnswerSetIdToPieceStyleNoMap } from '../answerSetPieceStyleUtil';
import { decodeBookConclusion, encodeBookConclusion } from './conclusionSaveCodec';
import { createClozePartLayoutTweaksForConclusion } from '../drawing/clozePartLayoutTweaks';
import BookPage from '../types/BookPage';

function _encodePage(page:BookPage):SavedBookPage {
  const { kind, chapterNo, headingText } = page;
  const base = { chapterNo, headingText };
  switch (kind) {
    case 'blank':
    case 'tally': return { ...base, kind };
    case 'bookStart': return { ...base, kind, title:page.title, subtitle:page.subtitle, author:page.author };
    case 'chapterStart': return { ...base, kind, levelUrl:page.levelUrl, title:page.title, description:page.description };
    case 'conclusion': return { ...base, kind, levelUrl:page.levelUrl, conclusion:encodeBookConclusion(page.conclusion) };
    case 'chapterEnd': return { ...base, kind, levelUrl:page.levelUrl, winSynopsis:page.winSynopsis };
  }
}

export function encodeBookPages(pages:readonly BookPage[]):SavedBookPage[] {
  return pages.map(_encodePage);
}

function _decodeBlank(page:SavedBookPage|undefined, chapterNo:number):BookPage|null {
  if (page?.kind !== 'blank' || page.chapterNo !== chapterNo) return null;
  return { kind:'blank', chapterNo, headingText:page.headingText };
}

export function decodeBookPages(savedPages:readonly SavedBookPage[]):BookPage[]|null {
  const coverBlank = _decodeBlank(savedPages[0], 0);
  const cover = savedPages[1];
  if (!coverBlank || cover?.kind !== 'bookStart' || cover.chapterNo !== 0) return null;
  const pages:BookPage[] = [coverBlank, { kind:'bookStart', chapterNo:0, headingText:cover.headingText,
    title:cover.title, subtitle:cover.subtitle, author:cover.author }];
  const chapterUrls = new Set<string>();
  let pageI = 2;

  for (let chapterNo = 1; pageI < savedPages.length; chapterNo++) {
    const openingBlank = _decodeBlank(savedPages[pageI++], chapterNo - 1);
    const start = savedPages[pageI++];
    if (!openingBlank || start?.kind !== 'chapterStart' || start.chapterNo !== chapterNo) return null;
    const { levelUrl } = start;
    if (chapterUrls.has(levelUrl)) return null;
    chapterUrls.add(levelUrl);
    pages.push(openingBlank, { kind:'chapterStart', chapterNo, levelUrl, headingText:start.headingText,
      title:start.title, description:start.description });

    const conclusions:Conclusion[] = [];
    const conclusionIds = new Set<string>();
    let savedPage = savedPages[pageI];
    while (savedPage?.kind === 'conclusion') {
      if (savedPage.chapterNo !== chapterNo || savedPage.levelUrl !== levelUrl) return null;
      const conclusion = decodeBookConclusion(savedPage.conclusion);
      const facingBlank = _decodeBlank(savedPages[pageI + 1], chapterNo);
      if (!conclusion || !facingBlank || conclusionIds.has(conclusion.id)) return null;
      conclusionIds.add(conclusion.id);
      conclusions.push(conclusion);
      pages.push({ kind:'conclusion', chapterNo, levelUrl, headingText:savedPage.headingText, conclusion,
        answerSetIdToPieceStyleNoMap:generateAnswerSetIdToPieceStyleNoMap(conclusion),
        layoutTweaks:createClozePartLayoutTweaksForConclusion(conclusion) }, facingBlank);
      pageI += 2;
      savedPage = savedPages[pageI];
    }

    const tally = savedPages[pageI++];
    const end = savedPages[pageI++];
    if (tally?.kind !== 'tally' || tally.chapterNo !== chapterNo || end?.kind !== 'chapterEnd'
      || end.chapterNo !== chapterNo || end.levelUrl !== levelUrl) return null;
    pages.push({ kind:'tally', chapterNo, headingText:tally.headingText, conclusions },
      { kind:'chapterEnd', chapterNo, levelUrl, headingText:end.headingText, winSynopsis:end.winSynopsis, conclusions });
  }
  return pages;
}