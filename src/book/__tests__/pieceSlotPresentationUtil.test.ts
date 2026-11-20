import { describe, expect, it } from 'vitest';
import { createLayout } from '@/canvasControls';
import { createAnswerSet } from '@/game/conclusions/answerSetUtil';
import ClozeBlank from '@/game/conclusions/types/ClozeBlank';
import { hideBook, showBook } from '../drawing/bookAnimationUtil';
import { invalidatePieceLayouts, updateBookLayoutAsNeeded } from '../drawing/bookLayoutUtil';
import BookLayout from '../drawing/types/BookLayout';
import { onBookMouseUp } from '../eventHandlers';
import { goNextPage } from '../navigationUtil';
import { beginBookPieceDrag, endBookPieceDrag, moveBookPieceDrag } from '../pieceInteractionUtil';
import { prepareBookPieceSlotPresentations } from '../pieceSlotPresentationUtil';
import BookPage from '../types/BookPage';
import { createDefaultBookState } from '../types/BookState';

function _createPreparedBook() {
  // Use independent mutable blanks sharing one immutable answer set.
  const answerSet = createAnswerSet(['First', 'Second'], 'people');
  const blank:ClozeBlank = { type:'blank', answerSet, correctAnswerIndexes:[1], playerAnswerIndex:-1 };
  const otherBlank:ClozeBlank = { ...blank, correctAnswerIndexes:[0] };
  const page:Extract<BookPage, { kind:'conclusion' }> = {
    kind:'conclusion', headingText:'', answerSetIdToPieceStyleNoMap:{ people:3 },
    conclusion:{ id:'synthetic', title:'Synthetic', parts:[blank, otherBlank], isComplete:false,
      isLocked:false, unlockConclusionIds:[], revealRoomIds:[] }
  };
  const piece = { conclusionId:'synthetic', text:'First', styleNo:3, xPercent:50, yPercent:50, placement:null };
  const bookState = createDefaultBookState();
  bookState.isVisible = true;
  bookState.pages = [page, { kind:'blank', headingText:'' },
    { kind:'blank', headingText:'' }, { kind:'blank', headingText:'' }];
  bookState.pieceStack = [piece];

  // Start away from either slot so both slots are awake rather than hungry.
  const first = { page, pageNo:1, partIndex:0, blank, styleNo:3, rect:{ x:200, y:100, width:40, height:30 },
    metrics:{ width:40, padding:2, fontSizePixels:12 } };
  const second = { ...first, partIndex:1, blank:otherBlank, rect:{ x:300, y:100, width:40, height:30 } };
  const layout:BookLayout = {
    canvasWidth:1000, canvasHeight:600, isSinglePageView:false,
    rect:{ x:100, y:20, width:800, height:500 }, controlLayout:createLayout(), pieceLayoutsPageNo:1,
    pieceLayouts:[{ piece, isVisible:true, rect:{ x:480, y:255, width:40, height:30 },
      metrics:{ width:40, padding:2, fontSizePixels:12 } }], pieceSlotLayouts:[first, second]
  };
  bookState.layout = layout;
  return { bookState, layout, page, blank, otherBlank, piece, first, second };
}

function _createGrowingSlot() {
  const fixture = _createPreparedBook();
  beginBookPieceDrag(fixture.bookState, 500, 270);
  moveBookPieceDrag(fixture.bookState, 220, 115);
  prepareBookPieceSlotPresentations(fixture.bookState, 0);
  return fixture;
}

describe('pieceSlotPresentationUtil', () => {
  describe('prepareBookPieceSlotPresentations()', () => {
    it('produces neutral presentation without an active drag', () => {
      const { bookState } = _createPreparedBook();
      expect(prepareBookPieceSlotPresentations(bookState, 45)).toEqual([]);
    });

    it('evaluates a bounded horizontal oscillation using explicit millisecond times', () => {
      const { bookState, first } = _createPreparedBook();
      beginBookPieceDrag(bookState, 500, 270);
      expect(prepareBookPieceSlotPresentations(bookState, 0)[0]).toEqual({ slot:first, offsetX:0, scale:1 });
      expect(prepareBookPieceSlotPresentations(bookState, 45)[0].offsetX).toBeCloseTo(1.2);
      expect(prepareBookPieceSlotPresentations(bookState, 90)[0].offsetX).toBeCloseTo(0);
      expect(prepareBookPieceSlotPresentations(bookState, 135)[0].offsetX).toBeCloseTo(-1.2);
      expect(prepareBookPieceSlotPresentations(bookState, 180)[0].offsetX).toBeCloseTo(0);
    });

    it('depends on elapsed clock values, not the number of evaluations', () => {
      const { bookState } = _createPreparedBook();
      beginBookPieceDrag(bookState, 500, 270);
      const expected = prepareBookPieceSlotPresentations(bookState, 225);
      prepareBookPieceSlotPresentations(bookState, 300);
      expect(prepareBookPieceSlotPresentations(bookState, 225)).toEqual(expected);
      expect(expected[0].offsetX).toBeCloseTo(1.2);
    });

    it('scales amplitude proportionally to normal slot height', () => {
      const { bookState, second } = _createPreparedBook();
      second.rect.height = 60;
      beginBookPieceDrag(bookState, 500, 270);
      const presentations = prepareBookPieceSlotPresentations(bookState, 45);
      expect(presentations[1].offsetX).toBeCloseTo(presentations[0].offsetX * 2);
    });

    it('keeps full slots neutral while another shared-answer-set blank shakes', () => {
      const { bookState, blank, second } = _createPreparedBook();
      blank.playerAnswerIndex = 0;
      beginBookPieceDrag(bookState, 500, 270);
      expect(prepareBookPieceSlotPresentations(bookState, 45)).toEqual([{ slot:second, offsetX:1.2, scale:1 }]);
    });

    it('keeps mismatched styles neutral', () => {
      const { bookState, piece } = _createPreparedBook();
      piece.styleNo = 4;
      beginBookPieceDrag(bookState, 500, 270);
      expect(prepareBookPieceSlotPresentations(bookState, 45)).toEqual([]);
    });

    it('keeps locked conclusions neutral', () => {
      const { bookState, page } = _createPreparedBook();
      page.conclusion.isLocked = true;
      beginBookPieceDrag(bookState, 500, 270);
      expect(prepareBookPieceSlotPresentations(bookState, 45)).toEqual([]);
    });

    it('suppresses hungry shaking and makes the old hungry slot awake on retargeting', () => {
      const { bookState, first, second } = _createPreparedBook();
      beginBookPieceDrag(bookState, 500, 270);
      moveBookPieceDrag(bookState, 220, 115);
      expect(prepareBookPieceSlotPresentations(bookState, 45)).toEqual([
        { slot:first, offsetX:0, scale:1 }, { slot:second, offsetX:1.2, scale:1 }
      ]);
      moveBookPieceDrag(bookState, 320, 115);
      expect(prepareBookPieceSlotPresentations(bookState, 45)).toEqual([
        { slot:first, offsetX:1.2, scale:1 }, { slot:second, offsetX:0, scale:1 }
      ]);
    });

    it('does not alter normal geometry, piece position, or blank answers', () => {
      const { bookState, layout, blank, otherBlank, piece } = _createPreparedBook();
      beginBookPieceDrag(bookState, 500, 270);
      const slots = structuredClone(layout.pieceSlotLayouts);
      const pieceRect = { ...layout.pieceLayouts[0].rect };
      prepareBookPieceSlotPresentations(bookState, 45);
      expect(layout.pieceSlotLayouts).toEqual(slots);
      expect(layout.pieceLayouts[0].rect).toEqual(pieceRect);
      expect([piece.xPercent, piece.yPercent]).toEqual([50, 50]);
      expect([blank.playerAnswerIndex, otherBlank.playerAnswerIndex]).toEqual([-1, -1]);
    });
  });

  describe('independent hungry-slot scale transitions', () => {
    it('starts neutral, interpolates by milliseconds, and stays at 120 percent while hungry', () => {
      const { bookState } = _createGrowingSlot();
      expect(prepareBookPieceSlotPresentations(bookState, 0)[0].scale).toBe(1);
      expect(prepareBookPieceSlotPresentations(bookState, 60)[0].scale).toBeCloseTo(1.1);
      expect(prepareBookPieceSlotPresentations(bookState, 120)[0].scale).toBe(1.2);
      expect(prepareBookPieceSlotPresentations(bookState, 500)[0].scale).toBe(1.2);
      expect(bookState.pieceSlotTransitions).toHaveLength(1);
    });

    it('reverses an unfinished enlargement from its interpolated scale, even between evaluations', () => {
      const { bookState } = _createGrowingSlot();
      prepareBookPieceSlotPresentations(bookState, 30);
      moveBookPieceDrag(bookState, 500, 270);
      expect(prepareBookPieceSlotPresentations(bookState, 60)[0].scale).toBeCloseTo(1.1);
      expect(prepareBookPieceSlotPresentations(bookState, 120)[0].scale).toBeCloseTo(1.05);
      expect(prepareBookPieceSlotPresentations(bookState, 180)[0].scale).toBe(1);
      expect(bookState.pieceSlotTransitions).toEqual([]);
    });

    it('shrinks and grows independent blanks sharing an answer set, including rapid reversals', () => {
      const { bookState, blank, otherBlank } = _createGrowingSlot();
      expect(blank.answerSet).toBe(otherBlank.answerSet);
      prepareBookPieceSlotPresentations(bookState, 120);
      moveBookPieceDrag(bookState, 320, 115);
      const start = prepareBookPieceSlotPresentations(bookState, 120);
      expect(start.map(presentation => presentation.scale)).toEqual([1.2, 1]);
      const halfway = prepareBookPieceSlotPresentations(bookState, 180);
      expect(halfway[0].scale).toBeCloseTo(1.1);
      expect(halfway[1].scale).toBeCloseTo(1.1);
      moveBookPieceDrag(bookState, 220, 115);
      expect(prepareBookPieceSlotPresentations(bookState, 180)).toMatchObject([
        { scale:halfway[0].scale, offsetX:0 }, { scale:halfway[1].scale }
      ]);
      const reversed = prepareBookPieceSlotPresentations(bookState, 240);
      expect(reversed[0].scale).toBeCloseTo(1.15);
      expect(reversed[1].scale).toBeCloseTo(1.05);
      expect(bookState.pieceSlotTransitions).toHaveLength(2);
    });

    it('allows an old hungry slot to shake while shrinking, but never shakes the new hungry slot', () => {
      const { bookState } = _createGrowingSlot();
      prepareBookPieceSlotPresentations(bookState, 120);
      moveBookPieceDrag(bookState, 320, 115);
      prepareBookPieceSlotPresentations(bookState, 120);
      const presentations = prepareBookPieceSlotPresentations(bookState, 150);
      expect(presentations[0].scale).toBeGreaterThan(1);
      expect(presentations[0].offsetX).not.toBe(0);
      expect(presentations[1].offsetX).toBe(0);
    });

    it('eases down after release without a target and prunes the settled transition', () => {
      const { bookState } = _createGrowingSlot();
      prepareBookPieceSlotPresentations(bookState, 120);
      onBookMouseUp(500, 270, 120, bookState);
      expect(bookState.hungryPieceSlot).toBeNull();
      expect(prepareBookPieceSlotPresentations(bookState, 120)[0]).toMatchObject({ scale:1.2, offsetX:0 });
      expect(prepareBookPieceSlotPresentations(bookState, 180)[0]).toMatchObject({ offsetX:0 });
      expect(prepareBookPieceSlotPresentations(bookState, 180)[0].scale).toBeCloseTo(1.1);
      expect(prepareBookPieceSlotPresentations(bookState, 240)).toEqual([]);
      expect(bookState.pieceSlotTransitions).toEqual([]);
    });

    it('does not restart shrinking when cancellation and listener cleanup repeat', () => {
      const { bookState } = _createGrowingSlot();
      prepareBookPieceSlotPresentations(bookState, 120);
      endBookPieceDrag(bookState);
      prepareBookPieceSlotPresentations(bookState, 120);
      const shrinking = bookState.pieceSlotTransitions[0];
      endBookPieceDrag(bookState);
      expect(prepareBookPieceSlotPresentations(bookState, 180)[0].scale).toBeCloseTo(1.1);
      expect(bookState.pieceSlotTransitions[0]).toBe(shrinking);
      endBookPieceDrag(bookState);
      expect(prepareBookPieceSlotPresentations(bookState, 240)).toEqual([]);
    });

    it('preserves transition continuity across refreshed normal geometry records', () => {
      const { bookState, layout, first, second } = _createGrowingSlot();
      layout.pieceSlotLayouts = [{ ...first, rect:{ ...first.rect } }, { ...second }];
      const presentation = prepareBookPieceSlotPresentations(bookState, 60)[0];
      expect(presentation.slot).not.toBe(first);
      expect(presentation.scale).toBeCloseTo(1.1);
      expect(bookState.pieceSlotTransitions).toHaveLength(1);
    });

    it('uses only normal rectangles for targeting while an old target is enlarged', () => {
      const { bookState, first } = _createGrowingSlot();
      const normalRect = { ...first.rect };
      prepareBookPieceSlotPresentations(bookState, 120);
      moveBookPieceDrag(bookState, first.rect.x + first.rect.width + 20, 115);
      const presentations = prepareBookPieceSlotPresentations(bookState, 120);
      expect(bookState.hungryPieceSlot).toBeNull();
      expect(presentations[0].scale).toBe(1.2);
      expect(first.rect).toEqual(normalRect);
    });

    it('immediately drops animation when its blank becomes full', () => {
      const { bookState, blank, first, otherBlank } = _createGrowingSlot();
      prepareBookPieceSlotPresentations(bookState, 120);
      blank.playerAnswerIndex = 0;
      const presentations = prepareBookPieceSlotPresentations(bookState, 150);
      expect(presentations.some(presentation => presentation.slot === first)).toBe(false);
      expect(bookState.pieceSlotTransitions).toEqual([]);
      expect(otherBlank.playerAnswerIndex).toBe(-1);
    });

    it('prunes transitions after replacing a page at the same number', () => {
      const { bookState, page } = _createGrowingSlot();
      prepareBookPieceSlotPresentations(bookState, 120);
      bookState.pages[0] = { ...page };
      expect(prepareBookPieceSlotPresentations(bookState, 150)).toEqual([]);
      expect(bookState.pieceSlotTransitions).toEqual([]);
    });

    it('prunes transitions after replacing the actual blank', () => {
      const { bookState, page, blank } = _createGrowingSlot();
      prepareBookPieceSlotPresentations(bookState, 120);
      page.conclusion.parts[0] = { ...blank };
      prepareBookPieceSlotPresentations(bookState, 150);
      expect(bookState.pieceSlotTransitions).toEqual([]);
    });

    it('discards old transitions when a layout is replaced even if the page number is unchanged', () => {
      const { bookState, layout } = _createGrowingSlot();
      prepareBookPieceSlotPresentations(bookState, 120);
      endBookPieceDrag(bookState);
      bookState.layout = { ...layout };
      expect(prepareBookPieceSlotPresentations(bookState, 150)).toEqual([]);
      expect(bookState.pieceSlotTransitions).toEqual([]);
    });

    it('prunes transitions when a single-page view hides the old target', () => {
      const { bookState, layout } = _createGrowingSlot();
      prepareBookPieceSlotPresentations(bookState, 120);
      endBookPieceDrag(bookState);
      layout.isSinglePageView = true;
      bookState.pageNo = layout.pieceLayoutsPageNo = 2;
      expect(prepareBookPieceSlotPresentations(bookState, 150)).toEqual([]);
      expect(bookState.pieceSlotTransitions).toEqual([]);
    });

    it('clears transitions synchronously on layout invalidation even without a remaining layout', () => {
      const { bookState } = _createGrowingSlot();
      prepareBookPieceSlotPresentations(bookState, 120);
      bookState.layout = null;
      invalidatePieceLayouts(bookState);
      expect(bookState.pieceSlotTransitions).toEqual([]);
    });

    it('discards enlargement when resizing', () => {
      const { bookState } = _createGrowingSlot();
      prepareBookPieceSlotPresentations(bookState, 120);
      updateBookLayoutAsNeeded(1200, 700, { width:800, height:500 } as ImageBitmap, bookState);
      expect(bookState.pieceSlotTransitions).toEqual([]);
      expect(prepareBookPieceSlotPresentations(bookState, 150)).toEqual([]);
    });

    it('cannot retain enlargement after closing and reopening', () => {
      const { bookState } = _createGrowingSlot();
      prepareBookPieceSlotPresentations(bookState, 120);
      hideBook(120, bookState);
      expect(bookState.pieceSlotTransitions).toEqual([]);
      showBook(150, bookState);
      expect(prepareBookPieceSlotPresentations(bookState, 180)).toEqual([]);
      expect(bookState.pieceSlotTransitions).toEqual([]);
    });
  });

  describe('nonvisual release and cancellation paths', () => {
    it('stops shaking immediately on release and remains neutral after listener cleanup', () => {
      const { bookState, blank, otherBlank } = _createPreparedBook();
      beginBookPieceDrag(bookState, 500, 270);
      expect(prepareBookPieceSlotPresentations(bookState, 45)).toHaveLength(2);
      onBookMouseUp(500, 270, 45, bookState);
      expect(prepareBookPieceSlotPresentations(bookState, 45)).toEqual([]);
      endBookPieceDrag(bookState);
      expect(prepareBookPieceSlotPresentations(bookState, 45)).toEqual([]);
      expect(bookState.hungryPieceSlot).toBeNull();
      expect([blank.playerAnswerIndex, otherBlank.playerAnswerIndex]).toEqual([-1, -1]);
    });

    it('stops through the shared blur/lost-button/hiding/unmount cancellation operation', () => {
      const { bookState } = _createPreparedBook();
      beginBookPieceDrag(bookState, 500, 270);
      prepareBookPieceSlotPresentations(bookState, 45);
      endBookPieceDrag(bookState);
      endBookPieceDrag(bookState);
      expect(prepareBookPieceSlotPresentations(bookState, 45)).toEqual([]);
      expect(bookState.hungryPieceSlot).toBeNull();
      expect(bookState.pieceDragState).toBeNull();
    });

    it('stops through layout invalidation', () => {
      const { bookState } = _createPreparedBook();
      beginBookPieceDrag(bookState, 500, 270);
      prepareBookPieceSlotPresentations(bookState, 45);
      invalidatePieceLayouts(bookState);
      expect(prepareBookPieceSlotPresentations(bookState, 45)).toEqual([]);
      expect(bookState.hungryPieceSlot).toBeNull();
    });

    it('stops when resize replaces the prepared layout', () => {
      const { bookState } = _createPreparedBook();
      beginBookPieceDrag(bookState, 500, 270);
      prepareBookPieceSlotPresentations(bookState, 45);
      updateBookLayoutAsNeeded(1200, 700, { width:800, height:500 } as ImageBitmap, bookState);
      expect(prepareBookPieceSlotPresentations(bookState, 45)).toEqual([]);
      expect(bookState.pieceDragState).toBeNull();
    });

    it('stops on navigation', () => {
      const { bookState } = _createPreparedBook();
      beginBookPieceDrag(bookState, 500, 270);
      prepareBookPieceSlotPresentations(bookState, 45);
      goNextPage(45, bookState);
      expect(prepareBookPieceSlotPresentations(bookState, 45)).toEqual([]);
      expect(bookState.hungryPieceSlot).toBeNull();
    });

    it('stops on closing and cannot reappear when reopening', () => {
      const { bookState } = _createPreparedBook();
      beginBookPieceDrag(bookState, 500, 270);
      prepareBookPieceSlotPresentations(bookState, 45);
      hideBook(45, bookState);
      expect(prepareBookPieceSlotPresentations(bookState, 45)).toEqual([]);
      showBook(90, bookState);
      expect(prepareBookPieceSlotPresentations(bookState, 135)).toEqual([]);
      expect(bookState.pieceDragState).toBeNull();
    });

    it('rejects replaced page content at the frame evaluation boundary', () => {
      const { bookState, page } = _createPreparedBook();
      beginBookPieceDrag(bookState, 500, 270);
      prepareBookPieceSlotPresentations(bookState, 45);
      bookState.pages[0] = { ...page };
      expect(prepareBookPieceSlotPresentations(bookState, 45)).toEqual([]);
      expect(bookState.hungryPieceSlot).toBeNull();
    });
  });
});