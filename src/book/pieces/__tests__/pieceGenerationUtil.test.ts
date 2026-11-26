import { describe, expect, it } from 'vitest';
import { createLayout } from '@/canvasControls';
import { createAnswerSet } from '@/conclusions';
import AnswerSet from '@/conclusions/types/AnswerSet';
import ClozeBlank from '@/conclusions/types/ClozeBlank';
import Conclusion from '@/conclusions/types/Conclusion';
import { generateAnswerSetIdToPieceStyleNoMap } from '@/book/answerSetPieceStyleUtil';
import { updatePieceStackForConclusionPages } from '../pieceGenerationUtil';
import BookPage from '@/book/types/BookPage';
import BookState, { createDefaultBookState } from '@/book/types/BookState';

function _createConclusionPage(conclusionId:string, answerSets:readonly AnswerSet[]):Extract<BookPage, { kind:'conclusion' }> {
  const conclusion:Conclusion = {
      id:conclusionId, title:conclusionId,
      parts:answerSets.map(answerSet => ({
        type:'blank', answerSet, correctAnswerIndexes:answerSet.answers.map((_, index) => index), playerAnswerIndex:-1
      })),
      isComplete:false, isLocked:false, isOptional:false, incorrectGuessCount:0, unlockConclusionIds:[], revealRoomIds:[]
  };
  return {
    kind:'conclusion', headingText:'', chapterNo:1, levelUrl:'first.md', conclusion,
    answerSetIdToPieceStyleNoMap:generateAnswerSetIdToPieceStyleNoMap(conclusion), layoutTweaks:[]
  };
}

function _createBookState(pages:BookPage[]):BookState {
  const state = createDefaultBookState();
  state.pages = pages.flatMap((page):BookPage[] => page.kind === 'conclusion'
    ? [page, { kind:'blank', headingText:'', chapterNo:1 }] : [page]);
  return state;
}

describe('pieceGenerationUtil', () => {
  describe('updatePieceStackForConclusionPages()', () => {
    it('leaves inventory empty for an empty book', () => {
      const state = createDefaultBookState();
      updatePieceStackForConclusionPages(state, 0);
      expect(state.pieceStack).toEqual([]);
    });

    it('ignores non-conclusion pages and conclusion parts without blanks', () => {
      const page = _createConclusionPage('empty', []);
      page.conclusion.parts = [
        { type:'text', text:'No blanks' }, { type:'separator' }, { type:'image', imageUrl:'/example.png' }
      ];
      const state = _createBookState([
        { kind:'blank', headingText:'', chapterNo:0 },
        { kind:'bookStart', headingText:'', chapterNo:0, title:'Book', subtitle:null, author:'Author' },
        { kind:'chapterStart', headingText:'', title:'Chapter', chapterNo:1, levelUrl:'first.md', description:'' },
        { kind:'blank', headingText:'', chapterNo:1 }, page
      ]);
      updatePieceStackForConclusionPages(state, 0);
      expect(state.pieceStack).toEqual([]);
    });

    it('emits full ordered inventory once for three shared blanks without changing their independent state', () => {
      // Share immutable options, not the blanks or their correct-index arrays.
      const answers = createAnswerSet(['B', 'A', 'C', 'Unused'], 'people');
      const page = _createConclusionPage('one', [answers, answers, answers]);
      const first:ClozeBlank = {
        type:'blank', answerSet:answers, correctAnswerIndexes:[0, 1, 2], playerAnswerIndex:2
      };
      const second:ClozeBlank = {
        type:'blank', answerSet:answers, correctAnswerIndexes:[2, 1, 0], playerAnswerIndex:0
      };
      const third:ClozeBlank = {
        type:'blank', answerSet:answers, correctAnswerIndexes:[1, 0, 2], playerAnswerIndex:-1
      };
      page.conclusion.parts = [first, second, third];
      const state = _createBookState([page]);
      const original = structuredClone(state.pages);

      // Repeated blanks must not affect order, distractors, or placement.
      updatePieceStackForConclusionPages(state, 0);
      const pieces = state.pieceStack;
      expect(pieces.map(({ text, styleNo }) => [text, styleNo])).toEqual([
        ['B', 3], ['A', 3], ['C', 3], ['Unused', 3]
      ]);
      expect(pieces.map(piece => piece.kind === 'answer' && (piece.placement?.blank ?? null))).toEqual([second, null, first, null]);
      expect(state.pages).toEqual(original);
      expect([first.answerSet, second.answerSet, third.answerSet].every(set => set === answers)).toBe(true);
      expect(first).not.toBe(second);
      expect(second).not.toBe(third);
      expect(first.correctAnswerIndexes).not.toBe(second.correctAnswerIndexes);
      expect(second.correctAnswerIndexes).not.toBe(third.correctAnswerIndexes);

      // Changing one selection leaves the other blanks and their indexes alone.
      second.playerAnswerIndex = 1;
      expect([first.playerAnswerIndex, second.playerAnswerIndex, third.playerAnswerIndex]).toEqual([2, 1, -1]);
      expect([first.correctAnswerIndexes, second.correctAnswerIndexes, third.correctAnswerIndexes])
        .toEqual([[0, 1, 2], [2, 1, 0], [1, 0, 2]]);
    });

    it('keeps disjoint categories ordered with distinct styles despite interleaved shared blanks', () => {
      const verbs = createAnswerSet(['lost', 'found'], 'verbs');
      const times = createAnswerSet(['yesterday', 'today'], 'times');
      const state = _createBookState([_createConclusionPage('one', [verbs, times, verbs, times])]);
      updatePieceStackForConclusionPages(state, 0);
      expect(state.pieceStack.map(({ text, styleNo }) => [text, styleNo])).toEqual([
        ['lost', 3], ['found', 3], ['yesterday', 4], ['today', 4]
      ]);
    });

    it('does not silently merge distinct categories with equal membership', () => {
      // Controlled invalid overlap: level validation owns rejection, not the generator.
      const first = createAnswerSet(['B', 'A'], 'first-category');
      const second = createAnswerSet(['A', 'B'], 'second-category');
      const state = _createBookState([_createConclusionPage('one', [first, second])]);
      updatePieceStackForConclusionPages(state, 0);
      expect(state.pieceStack.map(({ text, styleNo }) => [text, styleNo])).toEqual([
        ['B', 3], ['A', 3], ['A', 4], ['B', 4]
      ]);
    });

    it('keeps same-category inventories independent across pages with duplicate exact IDs and shared or fresh answer sets', () => {
      const shared = createAnswerSet(['B', 'A'], 'people');
      const fresh = createAnswerSet(['C', 'D'], 'people');
      const state = _createBookState([
        _createConclusionPage('one', [shared]), _createConclusionPage('one', [shared]),
        _createConclusionPage('one', [fresh])
      ]);
      updatePieceStackForConclusionPages(state, 0);
      const pieces = state.pieceStack;
      expect(pieces.map(({ pageI, text, styleNo }) => [pageI, text, styleNo])).toEqual([
        [0, 'B', 3], [0, 'A', 3], [2, 'B', 3], [2, 'A', 3],
        [4, 'C', 3], [4, 'D', 3]
      ]);
      expect(pieces[0]).not.toBe(pieces[2]);
      expect(pieces[0].xPercent).toBe(pieces[2].xPercent);
      expect(pieces[0].yPercent).toBe(pieces[2].yPercent);
      pieces[0].text = 'changed';
      pieces[0].xPercent = 99;
      expect(pieces[2]).toMatchObject({ pageI:2, text:'B', xPercent:75 });
    });

    it('assigns custom styles beyond eight without wrapping and restarts for each conclusion', () => {
      const state = _createBookState([
        _createConclusionPage('one', Array.from({ length:10 }, (_, index) =>
          createAnswerSet([String(index)], `category-${index}`))),
        _createConclusionPage('two', [createAnswerSet(['other'], 'other-options')])
      ]);
      updatePieceStackForConclusionPages(state, 0);
      expect(state.pieceStack.map(piece => piece.styleNo)).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 3]);
    });

    it('uses the page lookup for reserved, extended, and custom groups', () => {
      const sets = [
        createAnswerSet(['Hall'], 'rooms'),
        createAnswerSet(['Sam', 'Nobody'], 'characters'),
        createAnswerSet(['Key', 'Nothing'], 'items'),
        createAnswerSet(['found'], 'verbs')
      ];
      const conclusion:Conclusion = {
        id:'one', title:'One',
        parts:sets.map(answerSet => ({ type:'blank', answerSet, correctAnswerIndexes:[0], playerAnswerIndex:-1 })),
        isComplete:false, isLocked:false, isOptional:false, incorrectGuessCount:0, unlockConclusionIds:[], revealRoomIds:[]
      };
      const styles = generateAnswerSetIdToPieceStyleNoMap(conclusion);
      const state = _createBookState([
        { kind:'conclusion', headingText:'', chapterNo:1, levelUrl:'first.md', conclusion, answerSetIdToPieceStyleNoMap:styles, layoutTweaks:[] }
      ]);
      updatePieceStackForConclusionPages(state, 0);
      const pieces = state.pieceStack;
      expect(pieces.map(piece => piece.styleNo)).toEqual([2, 0, 0, 1, 1, 3]);
      sets.forEach(set => expect(pieces.filter(piece => set.answers.includes(piece.text))
        .every(piece => piece.styleNo === styles[set.id])).toBe(true));
    });

    it('deduplicates shared-category inventory using its reserved style', () => {
      const characters = createAnswerSet(['Sam', 'Nobody', 'Jo'], 'characters');
      const items = createAnswerSet(['Key', 'Nothing'], 'items');
      const rooms = createAnswerSet(['Hall', 'Nowhere'], 'rooms');
      const page = _createConclusionPage('one', [characters, items, characters, rooms, items, rooms, characters]);
      const state = _createBookState([page]);
      updatePieceStackForConclusionPages(state, 0);
      expect(state.pieceStack.map(({ text, styleNo }) => [text, styleNo])).toEqual([
        ['Sam', 0], ['Nobody', 0], ['Jo', 0], ['Key', 1], ['Nothing', 1], ['Hall', 2], ['Nowhere', 2]
      ]);
    });

    it('asserts missing styles even for a deduplicated blank', () => {
      // Make only the repeated blank's lookup invalid to exercise assertion ordering.
      const answers = createAnswerSet(['A', 'B'], 'people');
      const page = _createConclusionPage('one', [answers, answers]);
      let styleReads = 0;
      Object.defineProperty(page.answerSetIdToPieceStyleNoMap, answers.id, {
        get:() => ++styleReads === 1 ? 3 : undefined
      });
      expect(() => updatePieceStackForConclusionPages(_createBookState([page]), 0)).toThrow();
      expect(styleReads).toBe(2);
    });

    it('rejects a conclusion on the right even when it has no pieces', () => {
      const state = _createBookState([{ kind:'blank', headingText:'', chapterNo:1 }, _createConclusionPage('one', [])]);
      expect(() => updatePieceStackForConclusionPages(state, 0)).toThrow();
    });

    it('rejects a conclusion without a following page', () => {
      const state = _createBookState([_createConclusionPage('one', [])]);
      state.pages.pop();
      expect(() => updatePieceStackForConclusionPages(state, 0)).toThrow();
    });

    it('rejects a conclusion followed by a non-blank page', () => {
      const state = _createBookState([_createConclusionPage('one', [])]);
      state.pages[1] = _createConclusionPage('two', []);
      expect(() => updatePieceStackForConclusionPages(state, 0)).toThrow();
    });

    it('retains crowded inventories on the right page', () => {
      const answers = Array.from({ length:90 }, (_, index) => String(index));
      const state = _createBookState([
        _createConclusionPage('one', [createAnswerSet(answers, 'numbers')])
      ]);
      updatePieceStackForConclusionPages(state, 0);
      const pieces = state.pieceStack;
      expect(pieces.map(piece => piece.text)).toEqual(answers);
      expect(pieces.every(piece => piece.xPercent > 50 && piece.xPercent < 100
        && piece.yPercent > 0 && piece.yPercent < 100)).toBe(true);
    });

    it('generates all pages with null layout irrespective of the selected page', () => {
      const state = _createBookState([
        _createConclusionPage('one', [createAnswerSet(['A'], 'people')]),
        _createConclusionPage('two', [createAnswerSet(['B'], 'people')])
      ]);
      expect(state.layout).toBeNull();
      state.pageNo = 2;
      updatePieceStackForConclusionPages(state, 0);
      expect(state.pieceStack.map(piece => piece.text)).toEqual(['A', 'B']);
    });

    it('retains selected answers even when a conclusion is complete and locked', () => {
      const page = _createConclusionPage('one', [createAnswerSet(['A', 'B'], 'people')]);
      (page.conclusion.parts[0] as ClozeBlank).playerAnswerIndex = 0;
      page.conclusion.isComplete = true;
      page.conclusion.isLocked = true;
      const state = _createBookState([page]);
      updatePieceStackForConclusionPages(state, 0);
      expect(state.pieceStack.map(piece => piece.text)).toEqual(['A', 'B']);
    });

    it('appends without modifying frozen source data, existing pieces, or layout', () => {
      // Protect each source layer from writes, including the answer index arrays.
      const answers = ['B', 'A'];
      const answerSet = createAnswerSet(answers, 'people');
      const page = _createConclusionPage('one', [answerSet, answerSet]);
      const blank = page.conclusion.parts[0] as ClozeBlank;
      Object.freeze(answers);
      Object.freeze(answerSet);
      for (const part of page.conclusion.parts) {
        const sharedBlank = part as ClozeBlank;
        Object.freeze(sharedBlank.correctAnswerIndexes);
        Object.freeze(sharedBlank);
      }
      Object.freeze(page.conclusion.parts);
      Object.freeze(page.conclusion);
      Object.freeze(page.answerSetIdToPieceStyleNoMap);
      Object.freeze(page);

      // Preserve an already-positioned piece and an existing layout.
      const state = _createBookState([page]);
      const existingPiece = { kind:'answer' as const, pageI:0, text:'old', styleNo:12, xPercent:91, yPercent:82, placement:null };
      state.pieceStack = [existingPiece];
      state.layout = {
        canvasWidth:1000, canvasHeight:600, rect:{ x:0, y:0, width:800, height:500 },
        isSinglePageView:false,
        pieceLayouts:[], pieceSlotLayouts:[], pieceLayoutsPageNo:null, controlLayout:createLayout()
      };
      const originalPages = structuredClone(state.pages);
      const originalLayout = structuredClone(state.layout);
      const stack = state.pieceStack;
      Object.freeze(existingPiece);
      Object.freeze(state.pages);
      Object.freeze(state.layout.pieceLayouts);
      Object.freeze(state.layout);
      Object.freeze(state);

      // Appending may grow the stack without replacing it or changing source data.
      updatePieceStackForConclusionPages(state, 0);
      const pieces = state.pieceStack.slice(1);
      expect(state.pages).toEqual(originalPages);
      expect(state.layout).toEqual(originalLayout);
      expect(state.pieceStack[0]).toBe(existingPiece);
      expect(state.pieceStack).toBe(stack);
      expect(state.pieceStack).toHaveLength(3);
      expect(pieces.map(piece => piece.text)).toEqual(['B', 'A']);
      expect(pieces.every(piece => piece.styleNo === page.answerSetIdToPieceStyleNoMap[blank.answerSet.id])).toBe(true);
    });
  });
});