/* This file loads book metadata and creates chapter pages and their generated loose-piece inventory.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import BookState, { createDefaultBookState } from "./types/BookState";
import { generateAnswerSetIdToPieceStyleNoMap } from './answerSetPieceStyleUtil';
import Level from "@/game/types/Level";
import ConclusionPage from "./types/ConclusionPage";
import BookPage from "./types/BookPage";
import Conclusion from "@/game/conclusions/types/Conclusion";
import ChapterStartPage from "./types/ChapterStartPage";
import { updatePieceStackForConclusionPages } from './pieces';
import { parseSections, parseUniqueNameValueLines } from '@/common/markdownUtil';
import { baseUrl } from '@/common/urlUtil';
import { convertStraightQuotesToDirectional } from '@/common/quoteUtil';
import { createClozePartLayoutTweaksForConclusion } from "./drawing/clozePartLayoutTweaks";

function _findNextChapterNo(bookState:BookState):number {
  if (!bookState.pages.length) return 1;
  return bookState.pages[bookState.pages.length-1].chapterNo + 1;
}

function _addChapterStartPages(level:Level, chapterNo:number, pages:BookPage[]) {
  pages.push({ kind:'blank', headingText:'', chapterNo:chapterNo-1 });
  pages.push({ kind:'chapterStart', chapterNo, headingText:'', title:level.title, description:level.description });
}

function _addConclusionPages(conclusion:Conclusion, chapterNo:number, pages:BookPage[]) {
  const headingText = conclusion.isOptional ? `${conclusion.title} (optional)` : conclusion.title;
  const layoutTweaks = createClozePartLayoutTweaksForConclusion(conclusion);
  const conclusionPage:ConclusionPage = {
    kind:'conclusion', chapterNo, headingText, conclusion, 
    answerSetIdToPieceStyleNoMap:generateAnswerSetIdToPieceStyleNoMap(conclusion),
    layoutTweaks
  }
  pages.push(conclusionPage);
  pages.push({ kind:'blank', headingText, chapterNo });
}

function _addChapterEndPages(level:Level, chapterNo:number, pages:BookPage[]) {
  const { conclusions } = level;
  pages.push({ kind:'tally', chapterNo, headingText:'Tally', conclusions });
  pages.push({ kind:'chapterEnd', headingText:'End', chapterNo, winSynopsis:level.winSynopsis, conclusions });
}

function _doesBookHaveLevelChapter(bookState:BookState, level:Level):boolean {
  // Level title doesn't have uniqueness constraints, so in theory, two level files could have the same title and cause unexpected 
  // behavior. But in practice, this mistake is super-easy to spot by the author, and there isn't a real use case for an 
  // author wanting to represent the same title twice in levels. So it works fine as an ID.
  return bookState.pages.some(p => p.kind === 'chapterStart' && (p as ChapterStartPage).title === level.title);
}

function _addBookStartPages(title:string, subtitle:string|null, author:string, pages:BookPage[]) {
  pages.push({ kind:'blank', headingText:'', chapterNo:0 });
  pages.push({ kind:'bookStart', headingText:'', title, subtitle, author, chapterNo:0 });
}

export function addLevelChapterToBook(bookState:BookState, level:Level) {
  if (_doesBookHaveLevelChapter(bookState, level)) return;
  const chapterNo = _findNextChapterNo(bookState);
  const { pages } = bookState;
  const newPagesStartIndex = pages.length;
  _addChapterStartPages(level, chapterNo, pages);
  level.conclusions.forEach(c => _addConclusionPages(c, chapterNo, pages));
  _addChapterEndPages(level, chapterNo, pages);
  updatePieceStackForConclusionPages(bookState, newPagesStartIndex);
  bookState.pageNo = newPagesStartIndex + 1;
}

function _parseLevelUrls(levelsSection:string):string[] {
  return levelsSection.split('\n').map(line => line.trim())
    .filter(line => line.startsWith('*')).map(line => line.slice(1).trim()).filter(Boolean);
}

// This function is one of the rare exceptions where it is allowed to be exported for testing purposes.
/** @internal Exported for book-loading tests; production enters through loadBookFromUrl. */
export function loadBookFromText(text:string):BookState {
  const sections = parseSections(text, 1, true);
  const general = parseUniqueNameValueLines(sections.general ?? '', 'book general', true);
  const title = general.title?.trim();
  if (!title) throw new Error('Book is missing general title.');
  const bookState = createDefaultBookState();
  bookState.levelUrls = _parseLevelUrls(sections.levels ?? '');
  if (!bookState.levelUrls.length) throw new Error('Book has no level URLs.');
  const subtitle = general.subtitle ? convertStraightQuotesToDirectional(general.subtitle) : null;
  const author = convertStraightQuotesToDirectional(general.author || 'Unknown Author');
  _addBookStartPages(convertStraightQuotesToDirectional(title), subtitle, author, bookState.pages);
  return bookState;
}

export async function loadBookFromUrl(bookFileUrl:string):Promise<BookState> {
  const response = await fetch(baseUrl(bookFileUrl));
  if (!response.ok) throw new Error(`Unable to load book '${bookFileUrl}': HTTP ${response.status}.`);
  const bookState = loadBookFromText(await response.text());
  const directory = bookFileUrl.slice(0, bookFileUrl.lastIndexOf('/') + 1);
  bookState.levelUrls = bookState.levelUrls.map(levelUrl => levelUrl.startsWith('/') ? levelUrl : directory + levelUrl);
  return bookState;
}