/* This file creates temporary book pages and their generated loose-piece inventory.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import BookState, { createDefaultBookState } from "./types/BookState";
import { generateAnswerSetIdToPieceStyleNoMap } from './answerSetPieceStyleUtil';
import Level from "@/game/types/Level";
import ConclusionPage from "./types/ConclusionPage";
import BookPage from "./types/BookPage";
import Conclusion from "@/game/conclusions/types/Conclusion";
import ChapterStartPage from "./types/ChapterStartPage";
import { updatePieceStackForConclusionPages } from './pieces';

export function createBookState():BookState { // TODO this will change later to take some data, similar to createGameState().
  // Establish all pages before generating their loose-piece inventory.
  const bookState = createDefaultBookState();
  bookState.pages = [
    { kind:'blank', headingText:'', chapterNo:0 },
    { kind:'bookStart', headingText:'', title:'Frederick\nand the\nFreemasons', subtitle:null, author:'Erik Hermansen', chapterNo:0 },
  ];
  bookState.pieceStack = [];

  // Start with the book closed at its first page.
  bookState.pageNo = 1;
  bookState.isVisible = false;
  return bookState;
}

function _findNextChapterNo(bookState:BookState):number {
  if (!bookState.pages.length) return 1;
  return bookState.pages[bookState.pages.length-1].chapterNo + 1;
}

function _addChapterStartPages(level:Level, chapterNo:number, pages:BookPage[]) {
  pages.push({ kind:'blank', headingText:'', chapterNo:chapterNo-1 });
  pages.push({ kind:'chapterStart', chapterNo, headingText:'', title:level.title, description:level.description });
}

function _addConclusionPages(conclusion:Conclusion, chapterNo:number, pages:BookPage[]) {
  const conclusionPage:ConclusionPage = {
    kind:'conclusion', chapterNo, headingText:conclusion.title, conclusion, 
    answerSetIdToPieceStyleNoMap:generateAnswerSetIdToPieceStyleNoMap(conclusion)
  }
  pages.push(conclusionPage);
  pages.push({ kind:'blank', headingText:conclusion.title, chapterNo });
}

function _addChapterEndPages(level:Level, chapterNo:number, pages:BookPage[]) {
  pages.push({ kind:'tally', chapterNo, headingText:'Tally', conclusions:level.conclusions, winSynopsis:level.winSynopsis });
  pages.push({ kind:'chapterEnd', headingText:'', chapterNo, winSynopsis:level.winSynopsis });
}

function _doesBookHaveLevelChapter(bookState:BookState, level:Level):boolean {
  // Level title doesn't have uniqueness constraints, so in theory, two level files could have the same title and cause unexpected 
  // behavior. But in practice, this mistake is super-easy to spot by the author, and there isn't a real use case for an 
  // author wanting to represent the same title twice in levels. So it works fine as an ID.
  return bookState.pages.some(p => p.kind === 'chapterStart' && (p as ChapterStartPage).title === level.title);
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
}