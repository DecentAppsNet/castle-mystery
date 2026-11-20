import { describe, expect, it } from 'vitest';
import { createLayout } from '@/canvasControls';
import { createAnswerSet } from '@/game/conclusions/answerSetUtil';
import ClozeBlank from '@/game/conclusions/types/ClozeBlank';
import BookPage from '../types/BookPage';
import { createDefaultBookState } from '../types/BookState';
import BookLayout from '../drawing/types/BookLayout';
import { hideBook, showBook } from '../drawing/bookAnimationUtil';
import { invalidatePieceLayouts, updateBookLayoutAsNeeded } from '../drawing/bookLayoutUtil';
import { startPageFlip } from '../drawing/pageFlipAnimationUtil';
import { goNextPage } from '../navigationUtil';
import { beginBookPieceDrag } from '../pieceInteractionUtil';

function _createPreparedBook() {
  // Use synthetic content with separate mutable blanks sharing immutable metadata.
  const answerSet = createAnswerSet(['First', 'Second'], 'people');
  const blank:ClozeBlank = { type:'blank', answerSet, correctAnswerIndexes:[0], playerAnswerIndex:-1 };
  const otherBlank:ClozeBlank = { ...blank, correctAnswerIndexes:[1] };
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

  // Prepared records use displayed coordinates, without invoking canvas drawing.
  const layout:BookLayout = {
    canvasWidth:1000, canvasHeight:600, isSinglePageView:false, singlePageViewOffsetX:200,
    rect:{ x:100, y:20, width:800, height:500 }, controlLayout:createLayout(), pieceLayoutsPageNo:1,
    pieceLayouts:[{ piece, isVisible:true, rect:{ x:480, y:255, width:40, height:30 },
      metrics:{ width:40, padding:2, fontSizePixels:12 } }],
    pieceSlotLayouts:[
      { page, pageNo:1, partIndex:0, blank, styleNo:3, rect:{ x:200, y:100, width:60, height:30 } },
      { page, pageNo:1, partIndex:1, blank:otherBlank, styleNo:3, rect:{ x:300, y:100, width:60, height:30 } }
    ]
  };
  bookState.layout = layout;
  return { bookState, layout, blank, otherBlank, piece };
}

describe('prepared piece-slot geometry invalidation', () => {
  it('clears both collections and the shared validity marker while canceling a drag idempotently', () => {
    const { bookState, layout, blank, otherBlank, piece } = _createPreparedBook();
    expect(beginBookPieceDrag(bookState, 500, 270)).toBe(true);
    const stack = bookState.pieceStack;
    invalidatePieceLayouts(bookState);
    invalidatePieceLayouts(bookState);
    expect(layout.pieceSlotLayouts).toEqual([]);
    expect(layout.pieceLayouts).toEqual([]);
    expect(layout.pieceLayoutsPageNo).toBeNull();
    expect(bookState.pieceDragState).toBeNull();
    expect(bookState.pieceStack).toBe(stack);
    expect([piece.xPercent, piece.yPercent]).toEqual([50, 50]);
    expect([blank.playerAnswerIndex, otherBlank.playerAnswerIndex]).toEqual([-1, -1]);
  });

  it('discards old slot references and initializes empty records when resizing', () => {
    const { bookState, layout } = _createPreparedBook();
    updateBookLayoutAsNeeded(1200, 700, { width:800, height:500 } as ImageBitmap, bookState);
    expect(bookState.layout).not.toBe(layout);
    expect(layout.pieceSlotLayouts).toEqual([]);
    expect(bookState.layout?.pieceSlotLayouts).toEqual([]);
    expect(bookState.layout?.pieceLayoutsPageNo).toBeNull();
  });

  it('retains the prepared records when the canvas size has not changed', () => {
    const { bookState, layout } = _createPreparedBook();
    const records = layout.pieceSlotLayouts;
    updateBookLayoutAsNeeded(1000, 600, { width:800, height:500 } as ImageBitmap, bookState);
    expect(bookState.layout).toBe(layout);
    expect(layout.pieceSlotLayouts).toBe(records);
    expect(layout.pieceLayoutsPageNo).toBe(1);
  });

  it('clears prepared slots before navigating to another spread', () => {
    const { bookState, layout } = _createPreparedBook();
    goNextPage(0, bookState);
    expect(bookState.pageNo).toBe(3);
    expect(layout.pieceSlotLayouts).toEqual([]);
    expect(layout.pieceLayoutsPageNo).toBeNull();
  });

  it('clears prepared slots when starting a page-flip preview', () => {
    const { bookState, layout } = _createPreparedBook();
    startPageFlip(0, bookState, 'flipNext');
    expect(layout.pieceSlotLayouts).toEqual([]);
    expect(layout.pieceLayoutsPageNo).toBeNull();
  });

  it('clears prepared slots when closing the book', () => {
    const { bookState, layout } = _createPreparedBook();
    hideBook(0, bookState);
    expect(layout.pieceSlotLayouts).toEqual([]);
    expect(layout.pieceLayoutsPageNo).toBeNull();
  });

  it('discards previously prepared slots when reopening the book', () => {
    const { bookState, layout } = _createPreparedBook();
    bookState.isVisible = false;
    showBook(0, bookState);
    expect(layout.pieceSlotLayouts).toEqual([]);
    expect(layout.pieceLayoutsPageNo).toBeNull();
  });
});