import { describe, expect, it } from 'vitest';
import { createLayout } from '@/canvasControls';
import { createAnswerSet } from '@/game/conclusions/answerSetUtil';
import ClozeBlank from '@/game/conclusions/types/ClozeBlank';
import Conclusion from '@/game/conclusions/types/Conclusion';
import { generateAnswerSetIdToPieceStyleNoMap } from '../answerSetPieceStyleUtil';
import { generatePieceStack } from '../pieceGenerationUtil';
import BookPage from '../types/BookPage';
import BookState, { createDefaultBookState } from '../types/BookState';

function _createConclusionPage(conclusionId:string, answerGroups:string[][]):Extract<BookPage, { kind:'conclusion' }> {
  const conclusion:Conclusion = {
      id:conclusionId, title:conclusionId,
      parts:answerGroups.map(answers => ({
        type:'blank', answerSet:createAnswerSet(answers, [], false), correctAnswerIndexes:[0], playerAnswerIndex:-1
      })),
      isComplete:false, isLocked:false, unlockConclusionIds:[], revealRoomIds:[]
  };
  return {
    kind:'conclusion', headingText:'', conclusion,
    answerSetIdToPieceStyleNoMap:generateAnswerSetIdToPieceStyleNoMap(conclusion)
  };
}

function _createBookState(pages:BookPage[]):BookState {
  const state = createDefaultBookState();
  state.pages = pages.flatMap((page):BookPage[] => page.kind === 'conclusion'
    ? [page, { kind:'blank', headingText:'' }] : [page]);
  return state;
}

describe('pieceGenerationUtil', () => {
  describe('generatePieceStack()', () => {
    it('returns an empty inventory for an empty book', () => {
      const state = createDefaultBookState();
      expect(generatePieceStack(state)).toEqual([]);
      expect(generatePieceStack(state)).not.toBe(generatePieceStack(state));
    });

    it('ignores non-conclusion pages and conclusion parts without blanks', () => {
      const page = _createConclusionPage('empty', []);
      page.conclusion.parts = [
        { type:'text', text:'No blanks' }, { type:'separator' }, { type:'image', imageUrl:'/example.png' }
      ];
      const state = _createBookState([
        { kind:'blank', headingText:'' },
        { kind:'bookStart', headingText:'', title:'Book', subtitle:null, author:'Author' },
        { kind:'chapterStart', headingText:'', title:'Chapter', chapterNo:1, description:'' },
        { kind:'blank', headingText:'' }, page
      ]);
      expect(generatePieceStack(state)).toEqual([]);
    });

    it('emits a shared answer array only once within a conclusion', () => {
      const answers = ['B', 'A'];
      const state = _createBookState([_createConclusionPage('one', [answers, answers])]);
      expect(generatePieceStack(state)).toMatchObject([
        { conclusionId:'one', text:'B', styleNo:3 },
        { conclusionId:'one', text:'A', styleNo:3 }
      ]);
    });

    it('merges distinct arrays with equal membership within a conclusion', () => {
      const state = _createBookState([_createConclusionPage('one', [['A', 'B'], ['A', 'B']])]);
      expect(generatePieceStack(state).map(piece => piece.text)).toEqual(['A', 'B']);
    });

    it('merges reordered membership without changing answer order or indexes', () => {
      const first = ['B', 'A'];
      const reordered = ['A', 'B'];
      const page = _createConclusionPage('one', [first, reordered]);
      const blank = page.conclusion.parts[1] as ClozeBlank;
      blank.playerAnswerIndex = 1;
      const state = _createBookState([page]);
      const original = structuredClone(state);
      expect(generatePieceStack(state).map(piece => piece.text)).toEqual(['B', 'A']);
      expect(state).toEqual(original);
      expect(blank.answerSet.answers[blank.playerAnswerIndex]).toBe('B');
    });

    it('keeps partially overlapping and subset memberships separate', () => {
      const state = _createBookState([_createConclusionPage('one', [['A', 'B'], ['B', 'C'], ['A']])]);
      expect(generatePieceStack(state).map(({ text, styleNo }) => [text, styleNo])).toEqual([
        ['A', 3], ['B', 3], ['B', 4], ['C', 4], ['A', 5]
      ]);
    });

    it('compares answer strings exactly without normalization', () => {
      const state = _createBookState([_createConclusionPage('one', [['Amos'], ['amos'], [' Amos']])]);
      expect(generatePieceStack(state).map(({ text, styleNo }) => [text, styleNo])).toEqual([
        ['Amos', 3], ['amos', 4], [' Amos', 5]
      ]);
    });

    it('never merges a shared answer array across conclusion IDs', () => {
      const answers = ['A'];
      const state = _createBookState([
        _createConclusionPage('one', [answers]), _createConclusionPage('two', [answers])
      ]);
      expect(generatePieceStack(state)).toMatchObject([
        { conclusionId:'one', text:'A', styleNo:3 },
        { conclusionId:'two', text:'A', styleNo:3 }
      ]);
    });

    it('assigns custom styles beyond eight without wrapping and restarts for each conclusion', () => {
      const state = _createBookState([
        _createConclusionPage('one', [['0'], ['1'], ['2'], ['3'], ['4'], ['5'], ['6'], ['7'], ['8'], ['9']]),
        _createConclusionPage('two', [['other']])
      ]);
      expect(generatePieceStack(state).map(piece => piece.styleNo)).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 3]);
    });

    it('uses the page lookup for reserved, extended, and custom groups', () => {
      const sets = [
        createAnswerSet(['Hall'], ['rooms'], true),
        createAnswerSet(['Sam', 'Nobody'], ['characters', 'suspects'], false),
        createAnswerSet(['Key', 'Nothing'], ['items'], false),
        createAnswerSet(['found'], ['verbs'], true)
      ];
      const conclusion:Conclusion = {
        id:'one', title:'One',
        parts:sets.map(answerSet => ({ type:'blank', answerSet, correctAnswerIndexes:[0], playerAnswerIndex:-1 })),
        isComplete:false, isLocked:false, unlockConclusionIds:[], revealRoomIds:[]
      };
      const styles = generateAnswerSetIdToPieceStyleNoMap(conclusion);
      const pieces = generatePieceStack(_createBookState([
        { kind:'conclusion', headingText:'', conclusion, answerSetIdToPieceStyleNoMap:styles }
      ]));
      expect(pieces.map(piece => piece.styleNo)).toEqual([2, 0, 0, 1, 1, 3]);
      sets.forEach(set => expect(pieces.filter(piece => set.answers.includes(piece.text))
        .every(piece => piece.styleNo === styles[set.id])).toBe(true));
    });

    it('deduplicates reordered aliases using their shared reserved style', () => {
      const unknown = createAnswerSet(['B', 'A'], [], false);
      const characters = createAnswerSet(['A', 'B'], ['characters'], false);
      const conclusion:Conclusion = {
        id:'one', title:'One',
        parts:[unknown, characters].map(answerSet => ({ type:'blank', answerSet, correctAnswerIndexes:[0], playerAnswerIndex:1 })),
        isComplete:false, isLocked:false, unlockConclusionIds:[], revealRoomIds:[]
      };
      const styles = generateAnswerSetIdToPieceStyleNoMap(conclusion);
      const pieces = generatePieceStack(_createBookState([
        { kind:'conclusion', headingText:'', conclusion, answerSetIdToPieceStyleNoMap:styles }
      ]));
      expect(pieces.map(({ text, styleNo }) => [text, styleNo])).toEqual([['B', 0], ['A', 0]]);
      expect(styles[unknown.id]).toBe(styles[characters.id]);
      expect(conclusion.parts.map(part => (part as ClozeBlank).playerAnswerIndex)).toEqual([1, 1]);
    });

    it('asserts missing styles even for a deduplicated blank', () => {
      const page = _createConclusionPage('one', [['A'], ['A']]);
      const blank = page.conclusion.parts[1] as ClozeBlank;
      const alias = { ...blank.answerSet, id:'missing' };
      page.conclusion.parts[1] = { ...blank, answerSet:alias };
      expect(() => generatePieceStack(_createBookState([page]))).toThrow();
    });

    it('rejects a conclusion on the right even when it has no pieces', () => {
      const state = _createBookState([{ kind:'blank', headingText:'' }, _createConclusionPage('one', [])]);
      expect(() => generatePieceStack(state)).toThrow();
    });

    it('rejects a conclusion without a following page', () => {
      const state = _createBookState([_createConclusionPage('one', [])]);
      state.pages.pop();
      expect(() => generatePieceStack(state)).toThrow();
    });

    it('rejects a conclusion followed by a non-blank page', () => {
      const state = _createBookState([_createConclusionPage('one', [])]);
      state.pages[1] = _createConclusionPage('two', []);
      expect(() => generatePieceStack(state)).toThrow();
    });

    it('retains crowded inventories on the right page', () => {
      const answers = Array.from({ length:90 }, (_, index) => String(index));
      const pieces = generatePieceStack(_createBookState([_createConclusionPage('one', [answers])]));
      expect(pieces.map(piece => piece.text)).toEqual(answers);
      expect(pieces.every(piece => piece.xPercent > 50 && piece.xPercent < 100
        && piece.yPercent > 0 && piece.yPercent < 100)).toBe(true);
    });

    it('generates all pages with null layout irrespective of the selected page', () => {
      const state = _createBookState([
        _createConclusionPage('one', [['A']]), _createConclusionPage('two', [['B']])
      ]);
      expect(state.layout).toBeNull();
      const first = generatePieceStack(state);
      state.pageNo = 2;
      expect(generatePieceStack(state)).toEqual(first);
      expect(first.map(piece => piece.text)).toEqual(['A', 'B']);
    });

    it('retains selected answers even when a conclusion is complete and locked', () => {
      const page = _createConclusionPage('one', [['A', 'B']]);
      (page.conclusion.parts[0] as ClozeBlank).playerAnswerIndex = 0;
      page.conclusion.isComplete = true;
      page.conclusion.isLocked = true;
      expect(generatePieceStack(_createBookState([page])).map(piece => piece.text)).toEqual(['A', 'B']);
    });

    it('returns independent mutable pieces and retains mapped styles on every call', () => {
      const state = _createBookState([_createConclusionPage('one', [['A', 'B']])]);
      const first = generatePieceStack(state);
      const second = generatePieceStack(state);
      expect(first).not.toBe(second);
      expect(first).toEqual(second);
      first.forEach((piece, index) => expect(piece).not.toBe(second[index]));
      first[0].xPercent = 99;
      first[0].yPercent = 98;
      first.reverse();
      expect(generatePieceStack(state)).toEqual(second);
      expect(second[0]).toMatchObject({ conclusionId:'one', text:'A', styleNo:3 });
    });

    it('leaves frozen source data, existing stack, and layout untouched', () => {
      // Protect each source layer from writes, including the answer index arrays.
      const answers = ['B', 'A'];
      const page = _createConclusionPage('one', [answers]);
      const blank = page.conclusion.parts[0] as ClozeBlank;
      Object.freeze(answers);
      Object.freeze(blank.answerSet.sourceCategoryIds);
      Object.freeze(blank.answerSet);
      Object.freeze(blank.correctAnswerIndexes);
      Object.freeze(blank);
      Object.freeze(page.conclusion.parts);
      Object.freeze(page.conclusion);
      Object.freeze(page.answerSetIdToPieceStyleNoMap);
      Object.freeze(page);

      // Preserve an already-positioned piece and an existing layout.
      const state = _createBookState([page]);
      const existingPiece = { conclusionId:'one', text:'old', styleNo:12, xPercent:91, yPercent:82 };
      state.pieceStack = [existingPiece];
      state.layout = {
        canvasWidth:1000, canvasHeight:600, rect:{ x:0, y:0, width:800, height:500 },
        isSinglePageView:false, singlePageViewOffsetX:200,
        pieceLayouts:[], pieceLayoutsPageNo:null, controlLayout:createLayout()
      };
      const original = structuredClone(state);
      Object.freeze(existingPiece);
      Object.freeze(state.pieceStack);
      Object.freeze(state.pages);
      Object.freeze(state.layout.pieceLayouts);
      Object.freeze(state.layout);
      Object.freeze(state);

      // Generation must return new inventory without replacing any input references.
      const pieces = generatePieceStack(state);
      expect(state).toEqual(original);
      expect(state.pieceStack[0]).toBe(existingPiece);
      expect(pieces).not.toBe(state.pieceStack);
      expect(pieces.map(piece => piece.text)).toEqual(['B', 'A']);
      expect(pieces.every(piece => piece.styleNo === page.answerSetIdToPieceStyleNoMap[blank.answerSet.id])).toBe(true);
      expect(generatePieceStack(state)).toEqual(pieces);
    });
  });
});