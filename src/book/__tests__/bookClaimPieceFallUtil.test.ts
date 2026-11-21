import { describe, expect, it } from 'vitest';
import { createAnswerSet } from '@/game/conclusions/answerSetUtil';
import { prepareBookClaimPieceFalls } from '../bookClaimPieceFallUtil';
import { applyBookClaimResults } from '../bookClaimResultUtil';
import { createDefaultBookState } from '../types/BookState';
import BookClaimState from '../types/BookClaimState';
import BookPage from '../types/BookPage';
import ClozeBlank from '@/game/conclusions/types/ClozeBlank';
import PieceLayout from '../drawing/types/PieceLayout';
import { showBook } from '../drawing/bookAnimationUtil';

function _fixture(correct:boolean = true) {
  const answerSet = createAnswerSet(['Answer'], 'people');
  const blank:ClozeBlank = { type:'blank', answerSet, correctAnswerIndexes:[0], playerAnswerIndex:0 };
  const page:Extract<BookPage, { kind:'conclusion' }> = {
    kind:'conclusion', headingText:'', chapterNo:1, answerSetIdToPieceStyleNoMap:{ people:3 },
    conclusion:{ id:'fall', title:'Fall', parts:[blank], isComplete:false, isLocked:false,
      incorrectGuessCount:0, unlockConclusionIds:[], revealRoomIds:[] }
  };
  const claim:BookClaimState = { page, blanks:[blank], correct, startedAt:100,
    resultApplied:false, ejectedCount:0 };
  const layouts:PieceLayout[] = Array.from({ length:3 }, (_, index) => ({
    piece:{ conclusionId:'fall', placement:null, styleNo:3, text:'Unused', xPercent:20 + index * 20, yPercent:50 },
    rect:{ x:100 + index * 100, y:200, width:40, height:30 },
    metrics:{ width:40, padding:2, fontSizePixels:12 }, isVisible:true
  }));
  const assigned:PieceLayout = { ...layouts[0], piece:{ ...layouts[0].piece, placement:{ page, blank } } };
  const neighbor:PieceLayout = { ...layouts[0], piece:{ ...layouts[0].piece, conclusionId:'neighbor' } };
  return { claim, layouts, assigned, neighbor };
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

    it('leaves assigned pieces and another conclusion untouched', () => {
      const { claim, layouts, assigned, neighbor } = _fixture();
      const result = prepareBookClaimPieceFalls([...layouts, assigned, neighbor], claim, 4100, 600);
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
    it('removes unused pieces only at success completion and never restores them on reopening', () => {
      const { claim, layouts, assigned, neighbor } = _fixture();
      const state = createDefaultBookState();
      state.pieceStack = [assigned.piece, ...layouts.map(layout => layout.piece), neighbor.piece];
      applyBookClaimResults(state, claim, 4499);
      expect(state.pieceStack).toHaveLength(5);
      applyBookClaimResults(state, claim, 4500);
      expect(state.pieceStack).toEqual([assigned.piece, neighbor.piece]);
      const remaining = state.pieceStack;
      applyBookClaimResults(state, claim, 100000);
      expect(state.pieceStack).toBe(remaining);
      showBook(100000, state);
      expect(state.pieceStack).toBe(remaining);
      expect(claim.page.conclusion.isComplete).toBe(true);
    });

    it('catches up removal when all success frames are skipped', () => {
      const { claim, layouts, assigned, neighbor } = _fixture();
      const state = createDefaultBookState();
      state.pieceStack = [...layouts.map(layout => layout.piece), neighbor.piece, assigned.piece];
      applyBookClaimResults(state, claim, 100000);
      expect(state.pieceStack).toEqual([neighbor.piece, assigned.piece]);
    });
  });
});