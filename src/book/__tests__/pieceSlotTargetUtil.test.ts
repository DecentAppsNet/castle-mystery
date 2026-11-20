import { describe, expect, it } from 'vitest';
import { createLayout } from '@/canvasControls';
import { createAnswerSet } from '@/game/conclusions/answerSetUtil';
import ClozeBlank from '@/game/conclusions/types/ClozeBlank';
import BookPage from '../types/BookPage';
import { createDefaultBookState } from '../types/BookState';
import BookLayout from '../drawing/types/BookLayout';
import { onBookMouseDown, onBookMouseOver, onBookMouseUp } from '..';
import { invalidatePieceLayouts } from '../drawing/bookLayoutUtil';
import { beginBookPieceDrag, endBookPieceDrag, moveBookPieceDrag } from '../pieceInteractionUtil';
import { updateBookPieceSlotTarget } from '../pieceSlotTargetUtil';

function _createPreparedBook() {
  // Keep mutable blanks independent while sharing immutable answer metadata.
  const answerSet = createAnswerSet(['First', 'Second'], 'people');
  const blank:ClozeBlank = { type:'blank', answerSet, correctAnswerIndexes:[1], playerAnswerIndex:-1 };
  const otherBlank:ClozeBlank = { ...blank, correctAnswerIndexes:[0] };
  const styles = { people:3 };
  const page:Extract<BookPage, { kind:'conclusion' }> = {
    kind:'conclusion', headingText:'', answerSetIdToPieceStyleNoMap:styles,
    conclusion:{ id:'synthetic', title:'Synthetic', parts:[blank, otherBlank], isComplete:false,
      isLocked:false, incorrectGuessCount:0, unlockConclusionIds:[], revealRoomIds:[] }
  };
  const piece = { conclusionId:'synthetic', text:'First', styleNo:3, xPercent:50, yPercent:50, placement:null };
  const bookState = createDefaultBookState();
  bookState.isVisible = true;
  bookState.pages = [page, { kind:'blank', headingText:'' }];
  bookState.pieceStack = [piece];

  // Geometry is already in displayed canvas coordinates, independent of rendering.
  const first = { page, pageNo:1, partIndex:0, blank, styleNo:3, rect:{ x:480, y:255, width:40, height:30 },
    metrics:{ width:40, padding:2, fontSizePixels:12 } };
  const second = { ...first, partIndex:1, blank:otherBlank, rect:{ x:500, y:255, width:40, height:30 } };
  const layout:BookLayout = {
    canvasWidth:1000, canvasHeight:600, isSinglePageView:false,
    rect:{ x:100, y:20, width:800, height:500 }, controlLayout:createLayout(), pieceLayoutsPageNo:1,
    pieceLayouts:[{ piece, isVisible:true, rect:{ x:480, y:255, width:40, height:30 },
      metrics:{ width:40, padding:2, fontSizePixels:12 } }],
    pieceSlotLayouts:[first, second]
  };
  bookState.layout = layout;
  return { bookState, layout, page, blank, otherBlank, piece, first, second, styles };
}

function _putSecondSlotOnRightPage(fixture:ReturnType<typeof _createPreparedBook>) {
  const rightPage = { ...fixture.page };
  fixture.bookState.pages[1] = rightPage;
  const rightSlot = { ...fixture.second, page:rightPage, pageNo:2 };
  fixture.layout.pieceSlotLayouts = [fixture.first, rightSlot];
  return rightSlot;
}

describe('pieceSlotTargetUtil', () => {
  describe('updateBookPieceSlotTarget()', () => {
    it('starts with no target and has no eligible slots without an active drag', () => {
      const { bookState } = _createPreparedBook();
      expect(bookState.hungryPieceSlot).toBeNull();
      expect(updateBookPieceSlotTarget(bookState)).toEqual([]);
      expect(bookState.hungryPieceSlot).toBeNull();
    });

    it('selects an overlapping target immediately when a real drag begins', () => {
      const { bookState, first } = _createPreparedBook();
      expect(beginBookPieceDrag(bookState, 500, 270)).toBe(true);
      expect(bookState.hungryPieceSlot).toBe(first);
    });

    it('keeps nonoverlapping slots eligible without choosing a hungry target', () => {
      const { bookState, first, second } = _createPreparedBook();
      beginBookPieceDrag(bookState, 500, 270);
      moveBookPieceDrag(bookState, 700, 400);
      expect(updateBookPieceSlotTarget(bookState)).toEqual([first, second]);
      expect(bookState.hungryPieceSlot).toBeNull();
    });

    it('does not count touching horizontal edges as overlap', () => {
      const { bookState, layout, first } = _createPreparedBook();
      layout.pieceSlotLayouts = [{ ...first, rect:{ ...first.rect, x:520 } }];
      beginBookPieceDrag(bookState, 500, 270);
      expect(updateBookPieceSlotTarget(bookState)).toHaveLength(1);
      expect(bookState.hungryPieceSlot).toBeNull();
    });

    it('does not count touching vertical edges as overlap', () => {
      const { bookState, layout, first } = _createPreparedBook();
      layout.pieceSlotLayouts = [{ ...first, rect:{ ...first.rect, y:285 } }];
      beginBookPieceDrag(bookState, 500, 270);
      expect(bookState.hungryPieceSlot).toBeNull();
    });

    it('chooses the nearest overlapping center using both axes', () => {
      const { bookState, first, second } = _createPreparedBook();
      first.rect.y = 270;
      second.rect.x = 490;
      beginBookPieceDrag(bookState, 500, 270);
      expect(bookState.hungryPieceSlot).toBe(second);
    });

    it('resolves equal distances by part order even when records are reversed', () => {
      const { bookState, layout, first, second } = _createPreparedBook();
      first.rect.x = 470;
      second.rect.x = 490;
      layout.pieceSlotLayouts = [second, first];
      beginBookPieceDrag(bookState, 500, 270);
      expect(bookState.hungryPieceSlot).toBe(first);
      expect(updateBookPieceSlotTarget(bookState)).toEqual([first, second]);
      expect(layout.pieceSlotLayouts).toEqual([second, first]);
    });

    it('resolves equal distances by page order before part order', () => {
      const fixture = _createPreparedBook();
      const rightSlot = _putSecondSlotOnRightPage(fixture);
      fixture.first.rect.x = rightSlot.rect.x;
      fixture.layout.pieceSlotLayouts = [rightSlot, fixture.first];
      beginBookPieceDrag(fixture.bookState, 500, 270);
      expect(fixture.bookState.hungryPieceSlot).toBe(fixture.first);
    });

    it('rejects a piece with a different style', () => {
      const { bookState, piece } = _createPreparedBook();
      piece.styleNo = 4;
      beginBookPieceDrag(bookState, 500, 270);
      expect(updateBookPieceSlotTarget(bookState)).toEqual([]);
      expect(bookState.hungryPieceSlot).toBeNull();
    });

    it('rejects slots whose page style lookup no longer matches prepared geometry', () => {
      const { bookState, styles } = _createPreparedBook();
      styles.people = 4;
      beginBookPieceDrag(bookState, 500, 270);
      expect(updateBookPieceSlotTarget(bookState)).toEqual([]);
    });

    it('rejects matching styles and answers owned by another visible conclusion', () => {
      const { bookState, page, piece } = _createPreparedBook();
      piece.conclusionId = 'other';
      bookState.pages[1] = { ...page, conclusion:{ ...page.conclusion, id:'other' } };
      beginBookPieceDrag(bookState, 500, 270);
      expect(bookState.pieceDragState).not.toBeNull();
      expect(updateBookPieceSlotTarget(bookState)).toEqual([]);
      expect(bookState.hungryPieceSlot).toBeNull();
    });

    it('requires membership even when the style and conclusion match', () => {
      const { bookState, piece } = _createPreparedBook();
      piece.text = 'Not listed';
      beginBookPieceDrag(bookState, 500, 270);
      expect(updateBookPieceSlotTarget(bookState)).toEqual([]);
    });

    it('uses existing trimmed, case-insensitive answer matching', () => {
      const { bookState, piece, first } = _createPreparedBook();
      piece.text = '  fIRSt  ';
      beginBookPieceDrag(bookState, 500, 270);
      expect(bookState.hungryPieceSlot).toBe(first);
    });

    it('allows a listed wrong answer without consulting the correct-answer indexes', () => {
      const { bookState, blank, first } = _createPreparedBook();
      expect(blank.correctAnswerIndexes).toEqual([1]);
      beginBookPieceDrag(bookState, 500, 270);
      expect(bookState.hungryPieceSlot).toBe(first);
      expect(blank.playerAnswerIndex).toBe(-1);
    });

    it('keeps shared-answer-set blanks independent when one becomes full', () => {
      const { bookState, blank, otherBlank, first, second } = _createPreparedBook();
      expect(blank.answerSet).toBe(otherBlank.answerSet);
      beginBookPieceDrag(bookState, 500, 270);
      expect(bookState.hungryPieceSlot).toBe(first);
      blank.playerAnswerIndex = 0;
      expect(updateBookPieceSlotTarget(bookState)).toEqual([second]);
      expect(bookState.hungryPieceSlot).toBe(second);
      expect(otherBlank.playerAnswerIndex).toBe(-1);
    });

    it('excludes locked conclusions', () => {
      const { bookState, page } = _createPreparedBook();
      beginBookPieceDrag(bookState, 500, 270);
      page.conclusion.isLocked = true;
      expect(updateBookPieceSlotTarget(bookState)).toEqual([]);
      expect(bookState.hungryPieceSlot).toBeNull();
    });

    it('excludes completed conclusions', () => {
      const { bookState, page } = _createPreparedBook();
      beginBookPieceDrag(bookState, 500, 270);
      page.conclusion.isComplete = true;
      expect(updateBookPieceSlotTarget(bookState)).toEqual([]);
      expect(bookState.hungryPieceSlot).toBeNull();
    });

    it('considers both displayed pages in a two-page view', () => {
      const fixture = _createPreparedBook();
      const rightSlot = _putSecondSlotOnRightPage(fixture);
      beginBookPieceDrag(fixture.bookState, 500, 270);
      moveBookPieceDrag(fixture.bookState, 520, 270);
      expect(updateBookPieceSlotTarget(fixture.bookState)).toEqual([fixture.first, rightSlot]);
      expect(fixture.bookState.hungryPieceSlot).toBe(rightSlot);
    });

    it('also includes the left page when the selected page of a spread is right', () => {
      const fixture = _createPreparedBook();
      _putSecondSlotOnRightPage(fixture);
      fixture.bookState.pageNo = fixture.layout.pieceLayoutsPageNo = 2;
      beginBookPieceDrag(fixture.bookState, 500, 270);
      expect(fixture.bookState.hungryPieceSlot).toBe(fixture.first);
    });

    it('excludes the hidden right neighbor in a single-page view', () => {
      const fixture = _createPreparedBook();
      _putSecondSlotOnRightPage(fixture);
      fixture.layout.isSinglePageView = true;
      beginBookPieceDrag(fixture.bookState, 500, 270);
      expect(updateBookPieceSlotTarget(fixture.bookState)).toEqual([fixture.first]);
    });

    it('excludes the hidden left neighbor without reapplying the single-page offset', () => {
      const fixture = _createPreparedBook();
      const rightSlot = _putSecondSlotOnRightPage(fixture);
      fixture.layout.isSinglePageView = true;
      fixture.bookState.pageNo = fixture.layout.pieceLayoutsPageNo = 2;
      beginBookPieceDrag(fixture.bookState, 500, 270);
      expect(updateBookPieceSlotTarget(fixture.bookState)).toEqual([rightSlot]);
      expect(fixture.bookState.hungryPieceSlot).toBe(rightSlot);
    });

    it('rejects records from another spread even if their page references are current', () => {
      const { bookState, layout, page, first } = _createPreparedBook();
      bookState.pages.push(page);
      layout.pieceSlotLayouts = [{ ...first, pageNo:3 }];
      beginBookPieceDrag(bookState, 500, 270);
      expect(updateBookPieceSlotTarget(bookState)).toEqual([]);
    });

    it('rejects a replaced page even at the same number with the same conclusion', () => {
      const { bookState, page } = _createPreparedBook();
      beginBookPieceDrag(bookState, 500, 270);
      bookState.pages[0] = { ...page };
      expect(updateBookPieceSlotTarget(bookState)).toEqual([]);
      expect(bookState.hungryPieceSlot).toBeNull();
    });

    it('rejects a replaced blank but retains an unchanged blank sharing its answer set', () => {
      const { bookState, page, blank, second } = _createPreparedBook();
      beginBookPieceDrag(bookState, 500, 270);
      page.conclusion.parts[0] = { ...blank };
      expect(updateBookPieceSlotTarget(bookState)).toEqual([second]);
      expect(bookState.hungryPieceSlot).toBe(second);
    });

    it('rejects removed parts while retaining the piece inventory', () => {
      const { bookState, page, piece } = _createPreparedBook();
      beginBookPieceDrag(bookState, 500, 270);
      page.conclusion.parts = [];
      expect(updateBookPieceSlotTarget(bookState)).toEqual([]);
      expect(bookState.pieceStack).toEqual([piece]);
    });

    it('reselects refreshed records rather than retaining stale hover objects', () => {
      const { bookState, layout, first } = _createPreparedBook();
      beginBookPieceDrag(bookState, 500, 270);
      const refreshed = { ...first, rect:{ ...first.rect } };
      layout.pieceSlotLayouts = [refreshed];
      updateBookPieceSlotTarget(bookState);
      expect(bookState.hungryPieceSlot).toBe(refreshed);
    });
  });

  describe('drag integration and cancellation', () => {
    it('changes and clears targets on consecutive real pointer moves without drawing', () => {
      const { bookState, first, second } = _createPreparedBook();
      expect(onBookMouseDown(500, 270, 0, bookState, true)).toBe(true);
      expect(bookState.hungryPieceSlot).toBe(first);
      onBookMouseOver(520, 270, 1, bookState);
      expect(bookState.hungryPieceSlot).toBe(second);
      onBookMouseOver(500, 270, 2, bookState);
      expect(bookState.hungryPieceSlot).toBe(first);
      onBookMouseOver(700, 400, 3, bookState);
      expect(bookState.hungryPieceSlot).toBeNull();
    });

    it('clears the target after placing the final release answer without removing the piece', () => {
      const { bookState, piece, blank, otherBlank } = _createPreparedBook();
      onBookMouseDown(500, 270, 0, bookState, true);
      onBookMouseUp(520, 270, 1, bookState);
      expect(bookState.hungryPieceSlot).toBeNull();
      expect(bookState.pieceDragState).toBeNull();
      expect([blank.playerAnswerIndex, otherBlank.playerAnswerIndex]).toEqual([-1, 0]);
      expect(bookState.pieceStack).toEqual([piece]);
      expect(piece.xPercent).toBe(52.5);
    });

    it('clears the target immediately on repeated cancellation', () => {
      const { bookState, piece } = _createPreparedBook();
      beginBookPieceDrag(bookState, 500, 270);
      endBookPieceDrag(bookState);
      endBookPieceDrag(bookState);
      expect(bookState.hungryPieceSlot).toBeNull();
      expect(updateBookPieceSlotTarget(bookState)).toEqual([]);
      expect([piece.xPercent, piece.yPercent]).toEqual([50, 50]);
    });

    it('clears the logical target through layout invalidation', () => {
      const { bookState } = _createPreparedBook();
      beginBookPieceDrag(bookState, 500, 270);
      invalidatePieceLayouts(bookState);
      expect(bookState.hungryPieceSlot).toBeNull();
      expect(updateBookPieceSlotTarget(bookState)).toEqual([]);
    });

    it('cancels a stale prepared layout on the frame update boundary', () => {
      const { bookState, layout } = _createPreparedBook();
      beginBookPieceDrag(bookState, 500, 270);
      layout.pieceLayoutsPageNo = null;
      expect(updateBookPieceSlotTarget(bookState)).toEqual([]);
      expect(bookState.hungryPieceSlot).toBeNull();
      expect(bookState.pieceDragState).toBeNull();
    });

    it('cancels if the layout disappears', () => {
      const { bookState } = _createPreparedBook();
      beginBookPieceDrag(bookState, 500, 270);
      bookState.layout = null;
      expect(updateBookPieceSlotTarget(bookState)).toEqual([]);
      expect(bookState.pieceDragState).toBeNull();
    });

    it('cancels if the book becomes hidden', () => {
      const { bookState } = _createPreparedBook();
      beginBookPieceDrag(bookState, 500, 270);
      bookState.isVisible = false;
      expect(updateBookPieceSlotTarget(bookState)).toEqual([]);
      expect(bookState.hungryPieceSlot).toBeNull();
      expect(bookState.pieceDragState).toBeNull();
    });

    it('cancels when a book animation starts', () => {
      const { bookState } = _createPreparedBook();
      beginBookPieceDrag(bookState, 500, 270);
      bookState.animationKind = 'flipNext';
      expect(updateBookPieceSlotTarget(bookState)).toEqual([]);
      expect(bookState.hungryPieceSlot).toBeNull();
      expect(bookState.pieceDragState).toBeNull();
    });

    it('cancels a drag removed from the piece inventory', () => {
      const { bookState } = _createPreparedBook();
      beginBookPieceDrag(bookState, 500, 270);
      bookState.pieceStack = [];
      expect(updateBookPieceSlotTarget(bookState)).toEqual([]);
      expect(bookState.pieceDragState).toBeNull();
    });

    it('cancels a piece without visible prepared geometry', () => {
      const { bookState, layout } = _createPreparedBook();
      beginBookPieceDrag(bookState, 500, 270);
      layout.pieceLayouts[0].isVisible = false;
      expect(updateBookPieceSlotTarget(bookState)).toEqual([]);
      expect(bookState.hungryPieceSlot).toBeNull();
      expect(bookState.pieceDragState).toBeNull();
    });

    it('cancels when the owning conclusion is no longer displayed', () => {
      const { bookState } = _createPreparedBook();
      beginBookPieceDrag(bookState, 500, 270);
      bookState.pages = [{ kind:'blank', headingText:'' }];
      expect(updateBookPieceSlotTarget(bookState)).toEqual([]);
      expect(bookState.hungryPieceSlot).toBeNull();
      expect(bookState.pieceDragState).toBeNull();
    });
  });
});