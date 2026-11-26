import { describe, expect, it, vi } from 'vitest';
import { createAnswerSet } from '@/game/conclusions/answerSetUtil';
import { prepareBookClaimPieceFalls } from '../bookClaimPieceFallUtil';
import { applyBookClaimResults } from '../bookClaimResultUtil';
import { createDefaultBookState } from '@/book/types/BookState';
import BookClaimState from '../types/BookClaimState';
import BookPage from '@/book/types/BookPage';
import ClozeBlank from '@/game/conclusions/types/ClozeBlank';
import PieceLayout from '@/book/drawing/types/PieceLayout';
import { showBook } from '@/book/drawing/bookAnimationUtil';

const reportStorageError = vi.fn();

function _fixture(correct:boolean = true) {
  const answerSet = createAnswerSet(['Answer'], 'people');
  const blank:ClozeBlank = { type:'blank', answerSet, correctAnswerIndexes:[0], playerAnswerIndex:0 };
  const page:Extract<BookPage, { kind:'conclusion' }> = {
    kind:'conclusion', headingText:'', chapterNo:1, levelUrl:'first.md', answerSetIdToPieceStyleNoMap:{ people:3 }, layoutTweaks:[],
    conclusion:{ id:'fall', title:'Fall', parts:[blank], isComplete:false, isLocked:false, isOptional:false,
      incorrectGuessCount:0, unlockConclusionIds:[], revealRoomIds:[] }
  };
  const claim:BookClaimState = { page, conclusionPageI:0, blanks:[blank], correct, startedAt:100,
    resultApplied:false, ejectedCount:0 };
  const layouts:PieceLayout[] = Array.from({ length:3 }, (_, index) => ({
    piece:{ conclusionPageI:0, placement:null, styleNo:3, text:'Unused', xPercent:20 + index * 20, yPercent:50 },
    rect:{ x:100 + index * 100, y:200, width:40, height:30 },
    metrics:{ width:40, padding:2, fontSizePixels:12 }, isVisible:true
  }));
  const assigned:PieceLayout = { ...layouts[0], piece:{ ...layouts[0].piece, placement:{ page, blank } } };
  const neighborPage = { ...page, conclusion:{ ...page.conclusion,
    parts:[{ ...blank, playerAnswerIndex:-1 }] } };
  const neighbor:PieceLayout = { ...layouts[0], piece:{ ...layouts[0].piece, conclusionPageI:2 } };
  const pages:BookPage[] = [page, { kind:'blank', headingText:'', chapterNo:1 },
    neighborPage, { kind:'blank', headingText:'', chapterNo:1 }];
  return { claim, layouts, assigned, neighbor, pages, neighborPage };
}

describe('bookClaimPieceFallUtil', () => {
  describe('prepareBookClaimPieceFalls()', () => {
    it('leaves idle, inspection, and failure geometry unchanged', () => {
      const { claim, layouts } = _fixture();
      expect(prepareBookClaimPieceFalls(layouts, null, 2200, 600)).toBe(layouts);
      expect(prepareBookClaimPieceFalls(layouts, claim, 1600, 600)).toBe(layouts);
      expect(prepareBookClaimPieceFalls(layouts, _fixture(false).claim, 2200, 600)).toBe(layouts);
    });

    it('starts neutral and staggers pieces in stack order without changing their horizontal path', () => {
      const { claim, layouts } = _fixture();
      expect(prepareBookClaimPieceFalls(layouts, claim, 2100, 600)).toEqual(layouts);
      const early = prepareBookClaimPieceFalls(layouts, claim, 2600, 600);
      expect(early[0].rect.y).toBeGreaterThan(layouts[0].rect.y);
      expect(early[1].rect.y).toBe(layouts[1].rect.y);
      expect(early[2].rect.y).toBe(layouts[2].rect.y);
      const later = prepareBookClaimPieceFalls(layouts, claim, 3100, 600);
      expect(later[1].rect.y).toBeGreaterThan(layouts[1].rect.y);
      expect(later[2].rect.y).toBe(layouts[2].rect.y);
      later.forEach((layout, index) => expect(layout.rect.x).toBe(layouts[index].rect.x));
    });

    it('increases speed exponentially over equal time intervals', () => {
      const { claim, layouts } = _fixture();
      const sample = (time:number) => prepareBookClaimPieceFalls(layouts, claim, time, 600)[0].rect.y;
      const first = sample(2600) - sample(2100);
      const second = sample(3100) - sample(2600);
      const third = sample(3600) - sample(3100);
      expect(first).toBeGreaterThan(0);
      expect(second).toBeGreaterThan(first);
      expect(third / second).toBeCloseTo(second / first);
    });

    it('places every falling piece below the canvas before the last revolution ends', () => {
      const { claim, layouts } = _fixture();
      prepareBookClaimPieceFalls(layouts, claim, 4599, 600).forEach(layout => expect(layout.rect.y).toBeGreaterThan(600));
    });

    it('leaves assigned pieces and a page with a duplicate exact conclusion ID untouched', () => {
      const { claim, layouts, assigned, neighbor, neighborPage } = _fixture();
      expect(neighborPage.conclusion.id).toBe(claim.page.conclusion.id);
      const result = prepareBookClaimPieceFalls([...layouts, assigned, neighbor], claim, 4100, 600);
      expect(result[0]).not.toBe(layouts[0]);
      expect(result[0].piece).toBe(layouts[0].piece);
      expect(result[3]).toBe(assigned);
      expect(result[4]).toBe(neighbor);
    });

    it('uses current resized geometry without mutating positions or accumulating frame deltas', () => {
      const { claim, layouts } = _fixture();
      const before = structuredClone(layouts);
      const first = prepareBookClaimPieceFalls(layouts, claim, 4100, 600);
      prepareBookClaimPieceFalls(layouts, claim, 2200, 900);
      expect(prepareBookClaimPieceFalls(layouts, claim, 4100, 600)).toEqual(first);
      const resized = layouts.map(layout => ({ ...layout, rect:{ ...layout.rect, x:layout.rect.x + 200, y:300 } }));
      const result = prepareBookClaimPieceFalls(resized, claim, 4599, 900);
      result.forEach((layout, index) => {
        expect(layout.rect.y).toBeGreaterThan(900);
        expect(layout.rect.x).toBe(resized[index].rect.x);
      });
      expect(layouts).toEqual(before);
    });
  });

  describe('success removal', () => {
    it('removes only owned unused pieces at success completion despite duplicate exact IDs and never restores them on reopening', () => {
      const { claim, layouts, assigned, neighbor, pages, neighborPage } = _fixture();
      const state = createDefaultBookState();
      state.pages = pages;
      state.pieceStack = [assigned.piece, ...layouts.map(layout => layout.piece), neighbor.piece];
      applyBookClaimResults(state, claim, 4499, reportStorageError);
      expect(state.pieceStack).toHaveLength(5);
      applyBookClaimResults(state, claim, 4500, reportStorageError);
      expect(state.pieceStack).toEqual([assigned.piece, neighbor.piece]);
      expect(neighborPage.conclusion.isComplete).toBe(false);
      const remaining = state.pieceStack;
      applyBookClaimResults(state, claim, 100000, reportStorageError);
      expect(state.pieceStack).toBe(remaining);
      showBook(100000, state);
      expect(state.pieceStack).toBe(remaining);
      expect(claim.page.conclusion.isComplete).toBe(true);
    });

    it('catches up removal when all success frames are skipped', () => {
      const { claim, layouts, assigned, neighbor, pages } = _fixture();
      const state = createDefaultBookState();
      state.pages = pages;
      state.pieceStack = [...layouts.map(layout => layout.piece), neighbor.piece, assigned.piece];
      applyBookClaimResults(state, claim, 100000, reportStorageError);
      expect(state.pieceStack).toEqual([neighbor.piece, assigned.piece]);
    });
  });
});