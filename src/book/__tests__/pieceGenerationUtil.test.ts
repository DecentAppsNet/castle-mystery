import { describe, expect, it } from 'vitest';
import { createLayout } from '@/canvasControls';
import ClozeBlank from '@/game/conclusions/types/ClozeBlank';
import { generatePieceStack } from '../pieceGenerationUtil';
import BookPage from '../types/BookPage';
import BookState, { createDefaultBookState } from '../types/BookState';

function _createConclusionPage(conclusionId:string, answerGroups:string[][]):Extract<BookPage, { kind:'conclusion' }> {
  return {
    kind:'conclusion', headingText:'',
    conclusion:{
      id:conclusionId, title:conclusionId,
      parts:answerGroups.map(availableAnswers => ({
        type:'blank', availableAnswers, correctAnswerIndexes:[0], playerAnswerIndex:-1
      })),
      isComplete:false, isLocked:false, unlockConclusionIds:[], revealRoomIds:[]
    }
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
      expect(generatePieceStack(state)).toEqual([
        { conclusionId:'one', text:'B', styleNo:0, xPercent:75, yPercent:5 },
        { conclusionId:'one', text:'A', styleNo:0, xPercent:75, yPercent:10 }
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
      expect(blank.availableAnswers[blank.playerAnswerIndex]).toBe('B');
    });

    it('keeps partially overlapping and subset memberships separate', () => {
      const state = _createBookState([_createConclusionPage('one', [['A', 'B'], ['B', 'C'], ['A']])]);
      expect(generatePieceStack(state).map(({ text, styleNo }) => [text, styleNo])).toEqual([
        ['A', 0], ['B', 0], ['B', 1], ['C', 1], ['A', 2]
      ]);
    });

    it('compares answer strings exactly without normalization', () => {
      const state = _createBookState([_createConclusionPage('one', [['Amos'], ['amos'], [' Amos']])]);
      expect(generatePieceStack(state).map(({ text, styleNo }) => [text, styleNo])).toEqual([
        ['Amos', 0], ['amos', 1], [' Amos', 2]
      ]);
    });

    it('never merges a shared answer array across conclusion IDs', () => {
      const answers = ['A'];
      const state = _createBookState([
        _createConclusionPage('one', [answers]), _createConclusionPage('two', [answers])
      ]);
      expect(generatePieceStack(state)).toEqual([
        { conclusionId:'one', text:'A', styleNo:0, xPercent:75, yPercent:5 },
        { conclusionId:'two', text:'A', styleNo:1, xPercent:75, yPercent:5 }
      ]);
    });

    it('uses conclusion ID ownership to merge equivalent groups across pages', () => {
      const state = _createBookState([
        _createConclusionPage('one', [['B', 'A']]),
        _createConclusionPage('one', [['A', 'B'], ['C']])
      ]);
      expect(generatePieceStack(state)).toEqual([
        { conclusionId:'one', text:'B', styleNo:0, xPercent:75, yPercent:5 },
        { conclusionId:'one', text:'A', styleNo:0, xPercent:75, yPercent:10 },
        { conclusionId:'one', text:'C', styleNo:1, xPercent:75, yPercent:5 }
      ]);
    });

    it('continues sequential styles across pages beyond eight without wrapping', () => {
      const state = _createBookState([
        _createConclusionPage('one', [['0'], ['1'], ['2'], ['3'], ['4']]),
        _createConclusionPage('two', [['5'], ['6'], ['7'], ['8'], ['9']])
      ]);
      expect(generatePieceStack(state).map(piece => piece.styleNo)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it('separates groups on the right page and resets placement for each spread', () => {
      const state = _createBookState([
        _createConclusionPage('one', [['A', 'B'], ['C']]),
        _createConclusionPage('two', [['D']]),
        _createConclusionPage('three', [['E']])
      ]);
      expect(generatePieceStack(state).map(({ xPercent, yPercent }) => [xPercent, yPercent])).toEqual([
        [75, 5], [75, 10], [75, 20], [75, 5], [75, 5]
      ]);
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

    it('uses two fixed columns when one column reaches capacity', () => {
      const answers = Array.from({ length:18 }, (_, index) => String(index));
      const pieces = generatePieceStack(_createBookState([_createConclusionPage('one', [answers])]));
      expect(pieces.map(piece => piece.xPercent)).toEqual([...Array(9).fill(62.5), ...Array(9).fill(87.5)]);
      expect(pieces[8].yPercent).toBe(45);
      expect(pieces[9].yPercent).toBe(5);
    });

    it('uses three columns without squeezing when two columns reach capacity', () => {
      const answers = Array.from({ length:36 }, (_, index) => String(index));
      const pieces = generatePieceStack(_createBookState([_createConclusionPage('one', [answers])]));
      expect(new Set(pieces.map(piece => piece.xPercent)).size).toBe(3);
      expect(pieces[11].yPercent).toBe(60);
      expect(pieces[12].yPercent).toBe(5);
    });

    it('squeezes crowded inventories within the right page margins', () => {
      const answers = Array.from({ length:90 }, (_, index) => String(index));
      const pieces = generatePieceStack(_createBookState([_createConclusionPage('one', [answers])]));
      expect(pieces).toHaveLength(90);
      expect(new Set(pieces.map(piece => piece.xPercent)).size).toBe(3);
      expect(pieces.every(piece => piece.xPercent > 50 && piece.xPercent < 100
        && piece.yPercent >= 5 && piece.yPercent <= 95)).toBe(true);
      expect(pieces[1].yPercent - pieces[0].yPercent).toBeLessThan(5);
      expect(pieces[89].yPercent).toBeCloseTo(95);
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

    it('returns independent mutable pieces and resets styles on every call', () => {
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
      expect(second[0]).toEqual({ conclusionId:'one', text:'A', styleNo:0, xPercent:75, yPercent:5 });
    });

    it('leaves frozen source data, existing stack, and layout untouched', () => {
      // Protect each source layer from writes, including the answer index arrays.
      const answers = ['B', 'A'];
      const page = _createConclusionPage('one', [answers]);
      const blank = page.conclusion.parts[0] as ClozeBlank;
      Object.freeze(answers);
      Object.freeze(blank.correctAnswerIndexes);
      Object.freeze(blank);
      Object.freeze(page.conclusion.parts);
      Object.freeze(page.conclusion);
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
    });
  });
});