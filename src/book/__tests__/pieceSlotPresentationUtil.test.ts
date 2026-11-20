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
  const piece = { conclusionId:'synthetic', text:'First', styleNo:3, xPercent:50, yPercent:50 };
  const bookState = createDefaultBookState();
  bookState.isVisible = true;
  bookState.pages = [page, { kind:'blank', headingText:'' },
    { kind:'blank', headingText:'' }, { kind:'blank', headingText:'' }];
  bookState.pieceStack = [piece];

  // Start away from either slot so both slots are awake rather than hungry.
  const first = { page, pageNo:1, partIndex:0, blank, styleNo:3, rect:{ x:200, y:100, width:40, height:30 } };
  const second = { ...first, partIndex:1, blank:otherBlank, rect:{ x:300, y:100, width:40, height:30 } };
  const layout:BookLayout = {
    canvasWidth:1000, canvasHeight:600, isSinglePageView:false, singlePageViewOffsetX:200,
    rect:{ x:100, y:20, width:800, height:500 }, controlLayout:createLayout(), pieceLayoutsPageNo:1,
    pieceLayouts:[{ piece, isVisible:true, rect:{ x:480, y:255, width:40, height:30 },
      metrics:{ width:40, padding:2, fontSizePixels:12 } }], pieceSlotLayouts:[first, second]
  };
  bookState.layout = layout;
  return { bookState, layout, page, blank, otherBlank, piece, first, second };
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
      expect(prepareBookPieceSlotPresentations(bookState, 0)[0]).toEqual({ slot:first, offsetX:0 });
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
      expect(prepareBookPieceSlotPresentations(bookState, 45)).toEqual([{ slot:second, offsetX:1.2 }]);
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
        { slot:first, offsetX:0 }, { slot:second, offsetX:1.2 }
      ]);
      moveBookPieceDrag(bookState, 320, 115);
      expect(prepareBookPieceSlotPresentations(bookState, 45)).toEqual([
        { slot:first, offsetX:1.2 }, { slot:second, offsetX:0 }
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