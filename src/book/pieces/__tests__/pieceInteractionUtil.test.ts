import { describe, expect, it } from 'vitest';

import { createLayout, updateControlRect } from '@/canvasControls';
import { createDefaultBookState } from '@/book/types/BookState';
import ConclusionPage from '@/book/types/ConclusionPage';
import BookLayout from '@/book/drawing/types/BookLayout';
import { hideBook } from '@/book/drawing/bookAnimationUtil';
import { invalidatePieceLayouts, updateBookLayoutAsNeeded } from '@/book/drawing/bookLayoutUtil';
import { startPageFlip } from '@/book/drawing/pages';
import { goNextPage, goPrevPage } from '@/book/navigationUtil';
import { onBookMouseDown, onBookMouseOver, onBookMouseUp } from '@/book';
import { beginBookPieceDrag, bringBookPieceToFront, endBookPieceDrag, findBookPieceAtPoint,
  getVisibleBookPieces, moveBookPieceDrag, releaseBookPieceDrag } from '../pieceInteractionUtil';
import { NOTE_PIECE_STYLE_NO } from '../pieceFlairUtil';

function _createBookState() {
  const bookState = createDefaultBookState();
  const firstPage:ConclusionPage = {
    kind:'conclusion', headingText:'', chapterNo:1, levelUrl:'first.md', answerSetIdToPieceStyleNoMap:{}, layoutTweaks:[],
    conclusion:{ id:'first', title:'First', parts:[], isComplete:false, isLocked:false, isOptional:false,
      incorrectGuessCount:0, unlockConclusionIds:[], revealRoomIds:[] }
  };
  const secondPage:ConclusionPage = {
    ...firstPage, conclusion:{ ...firstPage.conclusion, id:'second', title:'Second' }
  };
  const lower = { kind:'answer' as const, pageI:0, text:'First', styleNo:3,
    xPercent:50, yPercent:50, placement:null };
  const upper = { ...lower, pageI:1 };
  bookState.pieceStack = [lower, upper];
  bookState.pages = [firstPage, secondPage];
  bookState.pageNo = 1;
  bookState.isVisible = true;
  const layout:BookLayout = {
    canvasWidth:1000, canvasHeight:600,
    rect:{ x:100, y:20, width:800, height:500 },
    isSinglePageView:false,
    pieceSlotLayouts:[],
    pieceLayoutsPageNo:1,
    pieceLayouts:[
      { piece:lower, isVisible:true, rect:{ x:80, y:40, width:40, height:30 },
        metrics:{ width:40, padding:2, fontSizePixels:12 } },
      { piece:upper, isVisible:true, rect:{ x:90, y:45, width:40, height:30 },
        metrics:{ width:40, padding:2, fontSizePixels:12 } }
    ],
    controlLayout:createLayout()
  };
  bookState.layout = layout;
  return { bookState, layout, lower, upper };
}

function _createDraggableBookState() {
  const fixture = _createBookState();
  for (const { piece, rect } of fixture.layout.pieceLayouts) {
    rect.x += 400;
    rect.y += 200;
    piece.xPercent = (rect.x + rect.width / 2 - fixture.layout.rect.x) / fixture.layout.rect.width * 100;
    piece.yPercent = (rect.y + rect.height / 2 - fixture.layout.rect.y) / fixture.layout.rect.height * 100;
  }
  return fixture;
}

describe('pieceInteractionUtil', () => {
  it('moves a note across the spread and leaves it on the destination page', () => {
    const { bookState, layout } = _createBookState();
    const note = { kind:'note' as const, pageI:0, text:'Remember this', styleNo:NOTE_PIECE_STYLE_NO,
      xPercent:50, yPercent:50 };
    const record = { ...layout.pieceLayouts[0], piece:note, rect:{ x:280, y:255, width:40, height:30 } };
    bookState.pieceStack = [note];
    layout.pieceLayouts = [record];

    expect(beginBookPieceDrag(bookState, 300, 270)).toBe(true);
    moveBookPieceDrag(bookState, 700, 270);
    expect(note.pageI).toBe(1);
    moveBookPieceDrag(bookState, 300, 270);
    expect(note.pageI).toBe(0);
    releaseBookPieceDrag(bookState, 700, 270);

    expect(note).toMatchObject({ pageI:1, xPercent:50, yPercent:50 });
    layout.isSinglePageView = true;
    expect(getVisibleBookPieces(bookState)).not.toContain(note);
    bookState.pageNo = 2;
    expect(getVisibleBookPieces(bookState)).toContain(note);
  });

  describe('drag cancellation on book transitions', () => {
    it('cancels when closing programmatically without undoing movement or stacking', () => {
      const { bookState, lower } = _createDraggableBookState();
      expect(beginBookPieceDrag(bookState, 485, 242)).toBe(true);
      moveBookPieceDrag(bookState, 585, 342);
      const position = [lower.xPercent, lower.yPercent];
      const stack = bookState.pieceStack;
      hideBook(0, bookState);
      expect(bookState.pieceDragState).toBeNull();
      expect(bookState.pieceStack).toBe(stack);
      expect(bookState.pieceStack[1]).toBe(lower);
      moveBookPieceDrag(bookState, 800, 400);
      expect([lower.xPercent, lower.yPercent]).toEqual(position);
    });

    it('cancels before programmatic next-spread navigation completes', () => {
      const { bookState } = _createDraggableBookState();
      bookState.pages.push({ kind:'blank', headingText:'', chapterNo:1 }, { kind:'blank', headingText:'', chapterNo:1 });
      expect(beginBookPieceDrag(bookState, 500, 250)).toBe(true);
      goNextPage(0, bookState);
      expect(bookState.pieceDragState).toBeNull();
      expect(bookState.pageNo).toBe(3);
    });

    it('cancels during programmatic previous-page navigation', () => {
      const { bookState, layout } = _createDraggableBookState();
      bookState.pageNo = layout.pieceLayoutsPageNo = 2;
      expect(beginBookPieceDrag(bookState, 500, 250)).toBe(true);
      goPrevPage(0, bookState);
      expect(bookState.pieceDragState).toBeNull();
      expect(bookState.pageNo).toBe(1);
    });

    it('cancels when single-page navigation starts a shift', () => {
      const { bookState, layout } = _createDraggableBookState();
      layout.isSinglePageView = true;
      layout.pieceLayouts.forEach(record => record.rect.x += 200);
      expect(beginBookPieceDrag(bookState, 700, 250)).toBe(true);
      goNextPage(0, bookState);
      expect(bookState.pieceDragState).toBeNull();
      expect(bookState.animationKind).toBe('shiftRight');
    });

    it('cancels when a page flip starts without navigation', () => {
      const { bookState } = _createDraggableBookState();
      expect(beginBookPieceDrag(bookState, 500, 250)).toBe(true);
      startPageFlip(0, bookState, 'flipNext');
      expect(bookState.pieceDragState).toBeNull();
    });

    it('cancels before replacing the layout on resize and preserves position and stacking', () => {
      const { bookState, layout, lower } = _createDraggableBookState();
      expect(beginBookPieceDrag(bookState, 485, 242)).toBe(true);
      moveBookPieceDrag(bookState, 585, 342);
      const position = [lower.xPercent, lower.yPercent];
      const stack = bookState.pieceStack;
      updateBookLayoutAsNeeded(1200, 700, { width:800, height:500 } as ImageBitmap, bookState);
      expect(bookState.layout).not.toBe(layout);
      expect(bookState.pieceDragState).toBeNull();
      expect(bookState.pieceStack).toBe(stack);
      expect([lower.xPercent, lower.yPercent]).toEqual(position);
      expect(findBookPieceAtPoint(bookState, 585, 342)).toBeNull();
    });

    it('does not cancel when the layout dimensions have not changed', () => {
      const { bookState, layout } = _createDraggableBookState();
      expect(beginBookPieceDrag(bookState, 500, 250)).toBe(true);
      const drag = bookState.pieceDragState;
      updateBookLayoutAsNeeded(1000, 600, { width:800, height:500 } as ImageBitmap, bookState);
      expect(bookState.layout).toBe(layout);
      expect(bookState.pieceDragState).toBe(drag);
    });

    it('can invalidate repeatedly even after the layout has been removed', () => {
      const { bookState } = _createDraggableBookState();
      expect(beginBookPieceDrag(bookState, 500, 250)).toBe(true);
      bookState.layout = null;
      invalidatePieceLayouts(bookState);
      invalidatePieceLayouts(bookState);
      expect(bookState.pieceDragState).toBeNull();
    });
  });

  describe('beginBookPieceDrag()', () => {
    it('selects the topmost piece without moving it and retains its style and grab offset', () => {
      const { bookState, upper } = _createDraggableBookState();
      expect(beginBookPieceDrag(bookState, 500, 250)).toBe(true);
      expect(bookState.pieceDragState?.piece).toBe(upper);
      expect(bookState.pieceDragState?.piece.styleNo).toBe(upper.styleNo);
      expect(bookState.pieceDragState?.grabOffset).toEqual([-10, -10]);
      expect(upper.xPercent).toBeCloseTo(51.25);
      expect(upper.yPercent).toBe(48);
    });

    it('promotes the selected lower piece before another hit test', () => {
      const { bookState, lower } = _createDraggableBookState();
      expect(beginBookPieceDrag(bookState, 485, 242)).toBe(true);
      expect(bookState.pieceStack[1]).toBe(lower);
      expect(findBookPieceAtPoint(bookState, 500, 250)).toBe(lower);
    });

    it('does not replace an active drag or its original grab offset', () => {
      const { bookState } = _createDraggableBookState();
      expect(beginBookPieceDrag(bookState, 500, 250)).toBe(true);
      const drag = bookState.pieceDragState;
      expect(beginBookPieceDrag(bookState, 485, 242)).toBe(false);
      expect(bookState.pieceDragState).toBe(drag);
    });

    it('does not begin while the book is hidden', () => {
      const { bookState } = _createDraggableBookState();
      bookState.isVisible = false;
      expect(beginBookPieceDrag(bookState, 500, 250)).toBe(false);
      expect(bookState.pieceDragState).toBeNull();
    });

    it('does not begin while the book is animating', () => {
      const { bookState } = _createDraggableBookState();
      bookState.animationKind = 'flipNext';
      expect(beginBookPieceDrag(bookState, 500, 250)).toBe(false);
      expect(bookState.pieceDragState).toBeNull();
    });

    it('does not begin with a stale layout or outside all pieces', () => {
      const { bookState, layout } = _createDraggableBookState();
      expect(beginBookPieceDrag(bookState, 0, 0)).toBe(false);
      layout.pieceLayoutsPageNo = null;
      expect(beginBookPieceDrag(bookState, 500, 250)).toBe(false);
      expect(bookState.pieceDragState).toBeNull();
    });
  });

  describe('moveBookPieceDrag()', () => {
    it('preserves an off-center grab on the first move without a jump', () => {
      const { bookState, upper } = _createDraggableBookState();
      expect(beginBookPieceDrag(bookState, 500, 250)).toBe(true);
      moveBookPieceDrag(bookState, 500, 250);
      expect(upper.xPercent).toBeCloseTo(51.25);
      expect(upper.yPercent).toBe(48);
    });

    it('updates percentages and hit selection on consecutive moves without drawing', () => {
      const { bookState, lower, upper } = _createDraggableBookState();
      expect(beginBookPieceDrag(bookState, 500, 250)).toBe(true);
      moveBookPieceDrag(bookState, 600, 350);
      expect(upper.xPercent).toBeCloseTo(63.75);
      expect(upper.yPercent).toBe(68);
      expect(findBookPieceAtPoint(bookState, 600, 350)).toBe(upper);
      expect(findBookPieceAtPoint(bookState, 500, 250)).toBe(lower);
      moveBookPieceDrag(bookState, 700, 400);
      expect(findBookPieceAtPoint(bookState, 700, 400)).toBe(upper);
      expect(findBookPieceAtPoint(bookState, 600, 350)).toBeNull();
    });

    it('clamps the center at every corner while allowing piece edges to protrude', () => {
      const { bookState, upper } = _createDraggableBookState();
      expect(beginBookPieceDrag(bookState, 500, 250)).toBe(true);
      moveBookPieceDrag(bookState, -1000, -1000);
      expect([upper.xPercent, upper.yPercent]).toEqual([0, 0]);
      expect(findBookPieceAtPoint(bookState, 90, 10)).toBe(upper);
      moveBookPieceDrag(bookState, 2000, -1000);
      expect([upper.xPercent, upper.yPercent]).toEqual([100, 0]);
      moveBookPieceDrag(bookState, -1000, 2000);
      expect([upper.xPercent, upper.yPercent]).toEqual([0, 100]);
      moveBookPieceDrag(bookState, 2000, 2000);
      expect([upper.xPercent, upper.yPercent]).toEqual([100, 100]);
    });

    it('uses the original grab offset after reentering the book', () => {
      const { bookState, upper } = _createDraggableBookState();
      expect(beginBookPieceDrag(bookState, 500, 250)).toBe(true);
      const offset = bookState.pieceDragState?.grabOffset;
      moveBookPieceDrag(bookState, -1000, -1000);
      moveBookPieceDrag(bookState, 500, 250);
      expect(upper.xPercent).toBeCloseTo(51.25);
      expect(upper.yPercent).toBe(48);
      expect(bookState.pieceDragState?.grabOffset).toBe(offset);
    });

    it('uses the displayed left-page offset exactly once', () => {
      const { bookState, layout, upper } = _createDraggableBookState();
      layout.isSinglePageView = true;
      layout.pieceLayouts.forEach(record => record.rect.x += 200);
      expect(beginBookPieceDrag(bookState, 700, 250)).toBe(true);
      moveBookPieceDrag(bookState, 800, 350);
      expect(upper.xPercent).toBeCloseTo(63.75);
      expect(upper.yPercent).toBe(68);
      expect(findBookPieceAtPoint(bookState, 800, 350)).toBe(upper);
    });

    it('uses the displayed right-page offset exactly once', () => {
      const { bookState, layout, upper } = _createDraggableBookState();
      layout.isSinglePageView = true;
      bookState.pageNo = layout.pieceLayoutsPageNo = 2;
      layout.pieceLayouts.forEach(record => record.rect.x -= 200);
      expect(beginBookPieceDrag(bookState, 300, 250)).toBe(true);
      moveBookPieceDrag(bookState, 400, 350);
      expect(upper.xPercent).toBeCloseTo(63.75);
      expect(upper.yPercent).toBe(68);
      expect(findBookPieceAtPoint(bookState, 400, 350)).toBe(upper);
    });

    it('converts movement using a differently sized and translated book', () => {
      const { bookState, layout, upper } = _createDraggableBookState();
      layout.rect = { x:200, y:100, width:400, height:200 };
      expect(beginBookPieceDrag(bookState, 500, 250)).toBe(true);
      moveBookPieceDrag(bookState, 400, 240);
      expect(upper.xPercent).toBe(52.5);
      expect(upper.yPercent).toBe(75);
    });

    it('cancels rather than mutating a piece with an invalidated layout', () => {
      const { bookState, layout, upper } = _createDraggableBookState();
      expect(beginBookPieceDrag(bookState, 500, 250)).toBe(true);
      layout.pieceLayoutsPageNo = null;
      moveBookPieceDrag(bookState, 600, 350);
      expect(bookState.pieceDragState).toBeNull();
      expect(upper.xPercent).toBeCloseTo(51.25);
      expect(upper.yPercent).toBe(48);
    });

    it('cancels rather than mutating a piece removed from the stack', () => {
      const { bookState, lower, upper } = _createDraggableBookState();
      expect(beginBookPieceDrag(bookState, 500, 250)).toBe(true);
      bookState.pieceStack = [lower];
      moveBookPieceDrag(bookState, 600, 350);
      expect(bookState.pieceDragState).toBeNull();
      expect(upper.xPercent).toBeCloseTo(51.25);
      expect(upper.yPercent).toBe(48);
    });
  });

  describe('endBookPieceDrag()', () => {
    it('is idempotent and preserves the last position and stacking after ending', () => {
      const { bookState, lower } = _createDraggableBookState();
      expect(beginBookPieceDrag(bookState, 485, 242)).toBe(true);
      moveBookPieceDrag(bookState, 585, 342);
      const position = [lower.xPercent, lower.yPercent];
      endBookPieceDrag(bookState);
      endBookPieceDrag(bookState);
      moveBookPieceDrag(bookState, 900, 900);
      expect(bookState.pieceDragState).toBeNull();
      expect([lower.xPercent, lower.yPercent]).toEqual(position);
      expect(bookState.pieceStack[1]).toBe(lower);
      expect(beginBookPieceDrag(bookState, 585, 342)).toBe(true);
    });

    it('can cancel without a layout', () => {
      const { bookState } = _createDraggableBookState();
      expect(beginBookPieceDrag(bookState, 500, 250)).toBe(true);
      bookState.layout = null;
      endBookPieceDrag(bookState);
      expect(bookState.pieceDragState).toBeNull();
    });
  });

  describe('getVisibleBookPieces()', () => {
    it('hides locked conclusion pieces and restores them unchanged on unlock', () => {
      const { bookState, lower, upper } = _createBookState();
      const page = bookState.pages[upper.pageI] as ConclusionPage;
      const stack = bookState.pieceStack;
      const original = structuredClone(stack);
      page.conclusion.isLocked = true;

      expect(getVisibleBookPieces(bookState)).toEqual([lower]);
      expect(findBookPieceAtPoint(bookState, 125, 60)).toBeNull();
      expect(bookState.pieceStack).toBe(stack);
      expect(stack).toEqual(original);

      page.conclusion.isLocked = false;
      expect(getVisibleBookPieces(bookState)).toEqual([lower, upper]);
      expect(findBookPieceAtPoint(bookState, 125, 60)).toBe(upper);
      expect(stack).toEqual(original);
    });

    it('preserves stack order for distinct pieces with identical text and style', () => {
      const { bookState, lower, upper } = _createBookState();
      const third = { ...lower };
      bookState.pieceStack = [upper, lower, third];
      const pieces = getVisibleBookPieces(bookState);
      expect(pieces).toHaveLength(3);
      expect(pieces[0]).toBe(upper);
      expect(pieces[1]).toBe(lower);
      expect(pieces[2]).toBe(third);
      expect(lower).not.toBe(upper);
    });

    it('filters hidden pages without losing their stacking order on return', () => {
      const { bookState, lower, upper } = _createBookState();
      bringBookPieceToFront(bookState, lower);
      bookState.pages.push({ kind:'blank', headingText:'', chapterNo:1 }, { kind:'blank', headingText:'', chapterNo:1 });
      bookState.pageNo = 3;
      expect(getVisibleBookPieces(bookState)).toEqual([]);
      expect(bookState.pieceStack[1]).toBe(lower);
      bookState.pageNo = 2;
      const pieces = getVisibleBookPieces(bookState);
      expect(pieces[0]).toBe(upper);
      expect(pieces[1]).toBe(lower);
    });

    it('reads changed stack membership without reconciling another collection', () => {
      const { bookState, lower, upper } = _createBookState();
      bringBookPieceToFront(bookState, lower);
      const replacement = { ...upper };
      bookState.pieceStack = [lower, replacement];
      const stack = bookState.pieceStack;
      const pieces = getVisibleBookPieces(bookState);
      expect(pieces[0]).toBe(lower);
      expect(pieces[1]).toBe(replacement);
      expect(bookState.pieceStack).toBe(stack);
      expect(bookState.pieceStack).not.toContain(upper);
    });

    it('preserves stacking across layout replacement', () => {
      const { bookState, lower, upper } = _createBookState();
      bringBookPieceToFront(bookState, lower);
      bookState.layout = null;
      expect(getVisibleBookPieces(bookState)[0]).toBe(upper);
      expect(getVisibleBookPieces(bookState)[1]).toBe(lower);
    });

    it('retains navigation ownership when a page with a duplicate exact ID is appended', () => {
      const { bookState, lower, upper } = _createBookState();
      const page = bookState.pages[0];
      bookState.pages.push({ ...page }, { kind:'blank', headingText:'', chapterNo:1 });
      const appended = { ...lower, pageI:2 };
      bookState.pieceStack.push(appended);
      expect(getVisibleBookPieces(bookState)).toEqual([lower, upper]);
      bookState.pageNo = 3;
      expect(getVisibleBookPieces(bookState)).toEqual([appended]);
      bookState.pageNo = 1;
      expect(getVisibleBookPieces(bookState)).toEqual([lower, upper]);
    });
  });

  describe('bringBookPieceToFront()', () => {
    it('updates prepared order and overlapping hit selection without another draw', () => {
      const { bookState, layout, lower, upper } = _createBookState();
      expect(findBookPieceAtPoint(bookState, 100, 50)).toBe(upper);
      bringBookPieceToFront(bookState, lower);
      expect(layout.pieceLayouts[0].piece).toBe(upper);
      expect(layout.pieceLayouts[1].piece).toBe(lower);
      expect(findBookPieceAtPoint(bookState, 100, 50)).toBe(lower);
      expect(getVisibleBookPieces(bookState)[1]).toBe(lower);
    });

    it('promotes repeatedly without duplicating references or changing conclusion ownership', () => {
      const { bookState, layout, lower, upper } = _createBookState();
      const conclusionPageIndexes = [lower.pageI, upper.pageI];
      const pages = [...bookState.pages];
      bringBookPieceToFront(bookState, lower);
      bringBookPieceToFront(bookState, upper);
      bringBookPieceToFront(bookState, upper);
      expect(bookState.pieceStack).toHaveLength(2);
      expect(bookState.pieceStack[0]).toBe(lower);
      expect(bookState.pieceStack[1]).toBe(upper);
      expect(layout.pieceLayouts).toHaveLength(2);
      expect([lower.pageI, upper.pageI]).toEqual(conclusionPageIndexes);
      expect(bookState.pages).toEqual(pages);
    });
  });

  describe('findBookPieceAtPoint()', () => {
    it('returns the topmost piece across both conclusion pages', () => {
      const { bookState, upper } = _createBookState();
      expect(findBookPieceAtPoint(bookState, 100, 50)).toBe(upper);
    });

    it('returns the lower piece outside the topmost rectangle', () => {
      const { bookState, lower } = _createBookState();
      expect(findBookPieceAtPoint(bookState, 85, 42)).toBe(lower);
    });

    it('skips a hidden topmost piece', () => {
      const { bookState, layout, lower } = _createBookState();
      layout.pieceLayouts[1].isVisible = false;
      expect(findBookPieceAtPoint(bookState, 100, 50)).toBe(lower);
    });

    it('uses prepared canvas coordinates without applying a single-page offset again', () => {
      const { bookState, layout, upper } = _createBookState();
      layout.isSinglePageView = true;
      expect(findBookPieceAtPoint(bookState, 100, 50)).toBe(upper);
      expect(findBookPieceAtPoint(bookState, 300, 50)).toBeNull();
    });

    it('returns null outside all pieces', () => {
      const { bookState } = _createBookState();
      expect(findBookPieceAtPoint(bookState, 500, 200)).toBeNull();
    });

    it('returns null for empty records', () => {
      const { bookState, layout } = _createBookState();
      layout.pieceLayouts = [];
      expect(findBookPieceAtPoint(bookState, 100, 50)).toBeNull();
    });

    it('returns null without a layout', () => {
      const { bookState } = _createBookState();
      bookState.layout = null;
      expect(findBookPieceAtPoint(bookState, 100, 50)).toBeNull();
    });

    it('returns null while hidden', () => {
      const { bookState } = _createBookState();
      bookState.isVisible = false;
      expect(findBookPieceAtPoint(bookState, 100, 50)).toBeNull();
    });

    it('returns null while animating', () => {
      const { bookState } = _createBookState();
      bookState.animationKind = 'flipNext';
      expect(findBookPieceAtPoint(bookState, 100, 50)).toBeNull();
    });

    it('rejects records prepared for another selected page', () => {
      const { bookState } = _createBookState();
      bookState.pageNo = 2;
      expect(findBookPieceAtPoint(bookState, 100, 50)).toBeNull();
    });

    it('rejects invalidated records', () => {
      const { bookState } = _createBookState();
      if (bookState.layout) bookState.layout.pieceLayoutsPageNo = null;
      expect(findBookPieceAtPoint(bookState, 100, 50)).toBeNull();
    });

    it('ignores obsolete records after page content is replaced', () => {
      const { bookState } = _createBookState();
      bookState.pages = [];
      expect(findBookPieceAtPoint(bookState, 100, 50)).toBeNull();
    });

    it('skips a stale topmost piece while retaining the visible lower piece', () => {
      const { bookState, lower } = _createBookState();
      bookState.pages[1] = { kind:'blank', headingText:'', chapterNo:1 };
      expect(findBookPieceAtPoint(bookState, 100, 50)).toBe(lower);
    });

    it('rejects a removed stack reference even when its conclusion is still visible', () => {
      const { bookState, lower } = _createBookState();
      bookState.pieceStack = [lower];
      expect(findBookPieceAtPoint(bookState, 100, 50)).toBe(lower);
    });
  });

  describe('onBookMouseDown()', () => {
    it('reports a drag start only when explicitly enabled', () => {
      const { bookState, upper } = _createDraggableBookState();
      expect(onBookMouseDown(500, 250, 0, bookState)).toBe(false);
      expect(bookState.pieceDragState).toBeNull();
      expect(onBookMouseDown(500, 250, 0, bookState, true)).toBe(true);
      expect(bookState.pieceDragState?.piece).toBe(upper);
      expect(onBookMouseDown(485, 242, 0, bookState, true)).toBe(false);
      expect(bookState.pieceDragState?.piece).toBe(upper);
    });

    it('keeps controls above pieces even when drag initiation is enabled', () => {
      const { bookState, layout } = _createDraggableBookState();
      updateControlRect('closeBook', { x:490, y:245, width:40, height:30 }, layout.controlLayout);
      expect(onBookMouseDown(500, 250, 0, bookState, true)).toBe(false);
      expect(bookState.pieceDragState).toBeNull();
      expect(bookState.animationKind).toBe('disappear');
    });

    it('keeps navigation working without reporting a drag', () => {
      const { bookState, layout } = _createDraggableBookState();
      bookState.pages.push({ kind:'blank', headingText:'', chapterNo:1 }, { kind:'blank', headingText:'', chapterNo:1 });
      updateControlRect('nextPage', { x:490, y:245, width:40, height:30 }, layout.controlLayout);
      expect(onBookMouseDown(500, 250, 0, bookState, true)).toBe(false);
      expect(bookState.pieceDragState).toBeNull();
      expect(bookState.pageNo).toBe(3);
      expect(bookState.animationKind).toBe('flipNext');
    });

    it('dismisses outside the book without starting a drag when enabled', () => {
      const { bookState } = _createDraggableBookState();
      expect(onBookMouseDown(0, 0, 0, bookState, true)).toBe(false);
      expect(bookState.pieceDragState).toBeNull();
      expect(bookState.animationKind).toBe('disappear');
    });

    it('promotes a clicked piece without moving its center', () => {
      const { bookState, lower } = _createBookState();
      const originalPosition = [lower.xPercent, lower.yPercent];
      onBookMouseDown(85, 42, 0, bookState);
      expect(findBookPieceAtPoint(bookState, 100, 50)).toBe(lower);
      expect([lower.xPercent, lower.yPercent]).toEqual(originalPosition);
    });

    it('does not dismiss when a visible piece protrudes beyond the book', () => {
      const { bookState } = _createBookState();
      onBookMouseDown(95, 50, 0, bookState);
      expect(bookState.animationKind).toBeNull();
      expect(bookState.isVisible).toBe(true);
    });

    it('still dismisses outside the book and all pieces', () => {
      const { bookState } = _createBookState();
      onBookMouseDown(0, 0, 0, bookState);
      expect(bookState.animationKind).toBe('disappear');
    });

    it('keeps a close control above an overlapping piece', () => {
      const { bookState, layout } = _createBookState();
      updateControlRect('closeBook', { x:90, y:45, width:40, height:30 }, layout.controlLayout);
      onBookMouseDown(100, 50, 0, bookState);
      expect(bookState.animationKind).toBe('disappear');
    });

    it('still applies the single-page offset to control lookup exactly once', () => {
      const { bookState, layout } = _createBookState();
      layout.isSinglePageView = true;
      updateControlRect('closeBook', { x:90, y:45, width:40, height:30 }, layout.controlLayout);
      onBookMouseDown(300, 50, 0, bookState);
      expect(bookState.animationKind).toBe('disappear');
    });

    it('does not protect protruding stale pieces from outside dismissal', () => {
      const { bookState } = _createBookState();
      bookState.pages = [];
      onBookMouseDown(95, 50, 0, bookState);
      expect(bookState.animationKind).toBe('disappear');
    });
  });

  describe('onBookMouseOver()', () => {
    it('keeps the hover start time until the pointer leaves the control', () => {
      const { bookState, layout } = _createDraggableBookState();
      updateControlRect('closeBook', { x:590, y:345, width:40, height:30 }, layout.controlLayout);
      onBookMouseOver(600, 350, 0, bookState);
      expect(layout.controlLayout.hoveredControlId).toBe('closeBook');
      onBookMouseOver(601, 350, 500, bookState);
      expect(layout.controlHoverStartedAt).toBe(0);
      onBookMouseOver(0, 0, 750, bookState);
      expect(layout.controlLayout.hoveredControlId).toBeNull();
      expect(layout.controlHoverStartedAt).toBeUndefined();
      onBookMouseOver(600, 350, 900, bookState);
      expect(layout.controlHoverStartedAt).toBe(900);
    });

    it('moves the active piece without updating control hover', () => {
      const { bookState, layout, upper } = _createDraggableBookState();
      updateControlRect('closeBook', { x:590, y:345, width:40, height:30 }, layout.controlLayout);
      expect(onBookMouseDown(500, 250, 0, bookState, true)).toBe(true);
      onBookMouseOver(600, 350, 0, bookState);
      expect(upper.xPercent).toBeCloseTo(63.75);
      expect(upper.yPercent).toBe(68);
      expect(findBookPieceAtPoint(bookState, 600, 350)).toBe(upper);
      expect(layout.controlLayout.hoveredControlId).toBeNull();
    });
  });

  describe('onBookMouseUp()', () => {
    it('applies the final release position and ends the drag outside the book', () => {
      const { bookState, upper } = _createDraggableBookState();
      expect(onBookMouseDown(500, 250, 0, bookState, true)).toBe(true);
      onBookMouseOver(600, 350, 0, bookState);
      onBookMouseUp(2000, 2000, 0, bookState);
      expect([upper.xPercent, upper.yPercent]).toEqual([100, 100]);
      expect(bookState.pieceDragState).toBeNull();
      expect(bookState.pieceStack[1]).toBe(upper);
      expect(bookState.isVisible).toBe(true);
      onBookMouseOver(500, 250, 0, bookState);
      onBookMouseUp(0, 0, 0, bookState);
      expect([upper.xPercent, upper.yPercent]).toEqual([100, 100]);
    });

    it('clears the drag after layout invalidation without accepting the release position', () => {
      const { bookState, layout, upper } = _createDraggableBookState();
      expect(onBookMouseDown(500, 250, 0, bookState, true)).toBe(true);
      onBookMouseOver(600, 350, 0, bookState);
      const position = [upper.xPercent, upper.yPercent];
      layout.pieceLayoutsPageNo = null;
      onBookMouseUp(2000, 2000, 0, bookState);
      expect(bookState.pieceDragState).toBeNull();
      expect([upper.xPercent, upper.yPercent]).toEqual(position);
    });

    it('clears the drag even after the book is hidden and its layout is removed', () => {
      const { bookState, upper } = _createDraggableBookState();
      expect(onBookMouseDown(500, 250, 0, bookState, true)).toBe(true);
      const position = [upper.xPercent, upper.yPercent];
      bookState.isVisible = false;
      bookState.layout = null;
      onBookMouseUp(2000, 2000, 0, bookState);
      expect(bookState.pieceDragState).toBeNull();
      expect([upper.xPercent, upper.yPercent]).toEqual(position);
    });

    it('clears the drag after animation starts without accepting the release position', () => {
      const { bookState, upper } = _createDraggableBookState();
      expect(onBookMouseDown(500, 250, 0, bookState, true)).toBe(true);
      const position = [upper.xPercent, upper.yPercent];
      bookState.animationKind = 'flipNext';
      onBookMouseUp(2000, 2000, 0, bookState);
      expect(bookState.pieceDragState).toBeNull();
      expect([upper.xPercent, upper.yPercent]).toEqual(position);
    });
  });
});