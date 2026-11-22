import { describe, expect, it } from 'vitest';
import { createLayout } from '@/canvasControls';
import { createAnswerSet } from '@/game/conclusions/answerSetUtil';
import ClozeBlank from '@/game/conclusions/types/ClozeBlank';
import { onBookMouseDown, onBookMouseOver, onBookMouseUp } from '@/book';
import { invalidatePieceLayouts } from '@/book/drawing/bookLayoutUtil';
import BookLayout from '@/book/drawing/types/BookLayout';
import { endBookPieceDrag, findBookPieceAtPoint, getVisibleBookPieces, releaseBookPieceDrag } from '../pieceInteractionUtil';
import { prepareBookPieceSlotPresentations } from '../pieceSlotPresentationUtil';
import BookPage from '@/book/types/BookPage';
import { createDefaultBookState } from '@/book/types/BookState';

function _createPreparedBook(conclusionPageI:number = 0) {
  // Share immutable options while retaining distinct answer state and correct indexes.
  const answerSet = createAnswerSet(['First', 'Second'], 'people');
  const blank:ClozeBlank = { type:'blank', answerSet, correctAnswerIndexes:[0], playerAnswerIndex:-1 };
  const otherBlank:ClozeBlank = { ...blank, correctAnswerIndexes:[1] };
  const page:Extract<BookPage, { kind:'conclusion' }> = {
    kind:'conclusion', headingText:'', chapterNo:1, answerSetIdToPieceStyleNoMap:{ people:3 },
    conclusion:{ id:'synthetic', title:'Synthetic', parts:[blank, otherBlank], isComplete:false,
      isLocked:false, incorrectGuessCount:0, unlockConclusionIds:[], revealRoomIds:[] }
  };
  const piece = { conclusionPageI, text:'First', styleNo:3, xPercent:50, yPercent:50, placement:null };
  const parkedPiece = { ...piece, text:'Second', xPercent:75, yPercent:75 };
  const bookState = createDefaultBookState();
  bookState.isVisible = true;
  bookState.pages = [page, { kind:'blank', headingText:'', chapterNo:1 }];
  bookState.pieceStack = [piece, parkedPiece];

  // Both slots overlap around the initial pointer; release must use normal geometry.
  const first = { page, pageNo:1, partIndex:0, blank, styleNo:3, rect:{ x:480, y:255, width:40, height:30 },
    metrics:{ width:40, padding:2, fontSizePixels:12 } };
  const second = { ...first, partIndex:1, blank:otherBlank, rect:{ x:500, y:255, width:40, height:30 } };
  const layout:BookLayout = {
    canvasWidth:1000, canvasHeight:600, isSinglePageView:false,
    rect:{ x:100, y:20, width:800, height:500 }, controlLayout:createLayout(), pieceLayoutsPageNo:1,
    pieceLayouts:[
      { piece, isVisible:true, rect:{ x:480, y:255, width:40, height:30 }, metrics:{ width:40, padding:2, fontSizePixels:12 } },
      { piece:parkedPiece, isVisible:true, rect:{ x:680, y:380, width:40, height:30 },
        metrics:{ width:40, padding:2, fontSizePixels:12 } }
    ], pieceSlotLayouts:[first, second]
  };
  bookState.layout = layout;
  return { bookState, layout, page, blank, otherBlank, piece, parkedPiece, first, second };
}

function _drop(fixture:ReturnType<typeof _createPreparedBook>, x:number = 500, y:number = 270) {
  expect(onBookMouseDown(500, 270, 0, fixture.bookState, true)).toBe(true);
  onBookMouseUp(x, y, 120, fixture.bookState);
}

describe('loose-piece release placement', () => {
  it('assigns only the selected blank while preserving shared options, correctness, completion, and inventory', () => {
    const fixture = _createPreparedBook();
    const { bookState, blank, otherBlank, page, piece, parkedPiece } = fixture;
    const answers = blank.answerSet;
    Object.freeze(answers.answers);
    Object.freeze(answers);
    Object.freeze(blank.correctAnswerIndexes);
    Object.freeze(otherBlank.correctAnswerIndexes);
    _drop(fixture);
    expect([blank.playerAnswerIndex, otherBlank.playerAnswerIndex]).toEqual([0, -1]);
    expect(blank.answerSet).toBe(answers);
    expect(otherBlank.answerSet).toBe(answers);
    expect([blank.correctAnswerIndexes, otherBlank.correctAnswerIndexes]).toEqual([[0], [1]]);
    expect([page.conclusion.isComplete, page.conclusion.isLocked]).toEqual([false, false]);
    expect(bookState.pieceStack).toEqual([parkedPiece, piece]);
    expect(bookState.pieceStack[1]).toBe(piece);
    expect([piece.xPercent, piece.yPercent]).toEqual([50, 50]);
    expect(bookState.pieceDragState).toBeNull();
    expect(bookState.hungryPieceSlot).toBeNull();
    expect(piece.placement).toEqual({ page, blank });
    expect(getVisibleBookPieces(bookState)).toEqual([parkedPiece]);
    expect(findBookPieceAtPoint(bookState, 500, 270)).toBeNull();
  });

  it('places a listed wrong answer using the final release position without an intervening move or draw', () => {
    const fixture = _createPreparedBook();
    _drop(fixture, 520, 270);
    expect([fixture.blank.playerAnswerIndex, fixture.otherBlank.playerAnswerIndex]).toEqual([-1, 0]);
    expect(fixture.otherBlank.correctAnswerIndexes).toEqual([1]);
    expect(fixture.piece.xPercent).toBe(52.5);
  });

  it('resolves the matching nonzero index using trimmed case-insensitive membership', () => {
    const fixture = _createPreparedBook();
    fixture.piece.text = '  sEConD ';
    _drop(fixture);
    expect(fixture.blank.playerAnswerIndex).toBe(1);
    expect(fixture.otherBlank.playerAnswerIndex).toBe(-1);
  });

  it('ignores a stale hover target when the final release no longer overlaps', () => {
    const fixture = _createPreparedBook();
    expect(onBookMouseDown(500, 270, 0, fixture.bookState, true)).toBe(true);
    expect(fixture.bookState.hungryPieceSlot).toBe(fixture.first);
    onBookMouseUp(850, 450, 120, fixture.bookState);
    expect([fixture.blank.playerAnswerIndex, fixture.otherBlank.playerAnswerIndex]).toEqual([-1, -1]);
    expect(fixture.piece.xPercent).toBe(93.75);
    expect(fixture.piece.placement).toBeNull();
  });

  it('chooses the nearest overlapping center at release', () => {
    const fixture = _createPreparedBook();
    _drop(fixture, 515, 270);
    expect([fixture.blank.playerAnswerIndex, fixture.otherBlank.playerAnswerIndex]).toEqual([-1, 0]);
  });

  it('resolves tied release candidates by part order rather than record order', () => {
    const fixture = _createPreparedBook();
    fixture.first.rect.x = 470;
    fixture.second.rect.x = 490;
    fixture.layout.pieceSlotLayouts = [fixture.second, fixture.first];
    _drop(fixture);
    expect([fixture.blank.playerAnswerIndex, fixture.otherBlank.playerAnswerIndex]).toEqual([0, -1]);
  });

  it('does not place when the final rectangle only touches a normal slot edge', () => {
    const fixture = _createPreparedBook();
    fixture.layout.pieceSlotLayouts = [fixture.first];
    _drop(fixture, 460, 270);
    expect(fixture.blank.playerAnswerIndex).toBe(-1);
  });

  it('rejects a mismatched piece style', () => {
    const fixture = _createPreparedBook();
    fixture.piece.styleNo = 4;
    _drop(fixture);
    expect([fixture.blank.playerAnswerIndex, fixture.otherBlank.playerAnswerIndex]).toEqual([-1, -1]);
  });

  it('rejects another page owner with a duplicate exact conclusion ID even if the answer and style match', () => {
    const fixture = _createPreparedBook(1);
    fixture.bookState.pages[1] = { ...fixture.page, conclusion:{ ...fixture.page.conclusion } };
    _drop(fixture);
    expect([fixture.blank.playerAnswerIndex, fixture.otherBlank.playerAnswerIndex]).toEqual([-1, -1]);
  });

  it('rejects a text value missing from the answer set', () => {
    const fixture = _createPreparedBook();
    fixture.piece.text = 'Not listed';
    _drop(fixture);
    expect([fixture.blank.playerAnswerIndex, fixture.otherBlank.playerAnswerIndex]).toEqual([-1, -1]);
  });

  it('does not replace an occupied slot but can assign another eligible overlapping blank', () => {
    const fixture = _createPreparedBook();
    fixture.blank.playerAnswerIndex = 1;
    _drop(fixture);
    expect([fixture.blank.playerAnswerIndex, fixture.otherBlank.playerAnswerIndex]).toEqual([1, 0]);
  });

  it('extracts the same piece before placing it in another blank, without duplicating inventory', () => {
    const fixture = _createPreparedBook();
    _drop(fixture);
    _drop(fixture, 520, 270);
    expect([fixture.blank.playerAnswerIndex, fixture.otherBlank.playerAnswerIndex]).toEqual([-1, 0]);
    expect(fixture.bookState.pieceStack).toHaveLength(2);
  });

  it('rejects a conclusion locked between drag start and release', () => {
    const fixture = _createPreparedBook();
    onBookMouseDown(500, 270, 0, fixture.bookState, true);
    fixture.page.conclusion.isLocked = true;
    onBookMouseUp(500, 270, 120, fixture.bookState);
    expect([fixture.blank.playerAnswerIndex, fixture.otherBlank.playerAnswerIndex]).toEqual([-1, -1]);
  });

  it('rejects a conclusion completed between drag start and release', () => {
    const fixture = _createPreparedBook();
    onBookMouseDown(500, 270, 0, fixture.bookState, true);
    fixture.page.conclusion.isComplete = true;
    onBookMouseUp(500, 270, 120, fixture.bookState);
    expect([fixture.blank.playerAnswerIndex, fixture.otherBlank.playerAnswerIndex]).toEqual([-1, -1]);
  });

  it('rejects invalidated geometry without accepting the final piece position', () => {
    const fixture = _createPreparedBook();
    onBookMouseDown(500, 270, 0, fixture.bookState, true);
    fixture.layout.pieceLayoutsPageNo = null;
    onBookMouseUp(520, 270, 120, fixture.bookState);
    expect([fixture.blank.playerAnswerIndex, fixture.otherBlank.playerAnswerIndex]).toEqual([-1, -1]);
    expect([fixture.piece.xPercent, fixture.piece.yPercent]).toEqual([50, 50]);
    expect(fixture.bookState.pieceDragState).toBeNull();
  });

  it('rejects a removed layout without assigning or moving', () => {
    const fixture = _createPreparedBook();
    onBookMouseDown(500, 270, 0, fixture.bookState, true);
    fixture.bookState.layout = null;
    onBookMouseUp(520, 270, 120, fixture.bookState);
    expect([fixture.blank.playerAnswerIndex, fixture.otherBlank.playerAnswerIndex]).toEqual([-1, -1]);
    expect([fixture.piece.xPercent, fixture.piece.yPercent]).toEqual([50, 50]);
  });

  it('rejects a page replaced at the same number even when the conclusion is unchanged', () => {
    const fixture = _createPreparedBook();
    onBookMouseDown(500, 270, 0, fixture.bookState, true);
    fixture.bookState.pages[0] = { ...fixture.page };
    onBookMouseUp(500, 270, 120, fixture.bookState);
    expect([fixture.blank.playerAnswerIndex, fixture.otherBlank.playerAnswerIndex]).toEqual([-1, -1]);
  });

  it('rejects a replaced blank rather than assigning its detached object', () => {
    const fixture = _createPreparedBook();
    fixture.layout.pieceSlotLayouts = [fixture.first];
    onBookMouseDown(500, 270, 0, fixture.bookState, true);
    const replacement = { ...fixture.blank };
    fixture.page.conclusion.parts[0] = replacement;
    onBookMouseUp(500, 270, 120, fixture.bookState);
    expect([fixture.blank.playerAnswerIndex, replacement.playerAnswerIndex]).toEqual([-1, -1]);
  });

  it('rejects removed content without assigning its retained blank references', () => {
    const fixture = _createPreparedBook();
    onBookMouseDown(500, 270, 0, fixture.bookState, true);
    fixture.bookState.pages = [];
    onBookMouseUp(500, 270, 120, fixture.bookState);
    expect([fixture.blank.playerAnswerIndex, fixture.otherBlank.playerAnswerIndex]).toEqual([-1, -1]);
  });

  it('rejects a piece removed from the inventory', () => {
    const fixture = _createPreparedBook();
    onBookMouseDown(500, 270, 0, fixture.bookState, true);
    fixture.bookState.pieceStack = [fixture.parkedPiece];
    onBookMouseUp(500, 270, 120, fixture.bookState);
    expect([fixture.blank.playerAnswerIndex, fixture.otherBlank.playerAnswerIndex]).toEqual([-1, -1]);
  });

  it('never assigns through repeated cancellation followed by a late release', () => {
    const fixture = _createPreparedBook();
    onBookMouseDown(500, 270, 0, fixture.bookState, true);
    onBookMouseOver(520, 270, 60, fixture.bookState);
    const stack = fixture.bookState.pieceStack;
    endBookPieceDrag(fixture.bookState);
    endBookPieceDrag(fixture.bookState);
    onBookMouseUp(500, 270, 120, fixture.bookState);
    expect([fixture.blank.playerAnswerIndex, fixture.otherBlank.playerAnswerIndex]).toEqual([-1, -1]);
    expect(fixture.piece.xPercent).toBe(52.5);
    expect(fixture.bookState.pieceStack).toBe(stack);
    expect(fixture.piece.placement).toBeNull();
  });

  it('cannot assign after the normal invalidation cancellation funnel', () => {
    const fixture = _createPreparedBook();
    onBookMouseDown(500, 270, 0, fixture.bookState, true);
    invalidatePieceLayouts(fixture.bookState);
    onBookMouseUp(520, 270, 120, fixture.bookState);
    expect([fixture.blank.playerAnswerIndex, fixture.otherBlank.playerAnswerIndex]).toEqual([-1, -1]);
  });

  it('retains the successful answer, piece position, and stacking through repeated listener cleanup', () => {
    const fixture = _createPreparedBook();
    _drop(fixture);
    const stack = fixture.bookState.pieceStack;
    endBookPieceDrag(fixture.bookState);
    endBookPieceDrag(fixture.bookState);
    releaseBookPieceDrag(fixture.bookState, 520, 270);
    onBookMouseUp(520, 270, 120, fixture.bookState);
    expect([fixture.blank.playerAnswerIndex, fixture.otherBlank.playerAnswerIndex]).toEqual([0, -1]);
    expect(fixture.bookState.pieceStack).toBe(stack);
    expect([fixture.piece.xPercent, fixture.piece.yPercent]).toEqual([50, 50]);
  });

  it('extracts at the full slot rectangle with the same grab point, then leaves it loose on cancellation', () => {
    const fixture = _createPreparedBook();
    const { bookState, first, blank, piece, layout } = fixture;
    _drop(fixture);
    Object.assign(first.rect, { x:200, y:100, width:80, height:36 });
    first.metrics.width = 80;
    expect(onBookMouseDown(210, 110, 150, bookState, true)).toBe(true);
    expect(blank.playerAnswerIndex).toBe(-1);
    expect(piece.placement).toBeNull();
    expect(bookState.pieceDragState).toMatchObject({ piece, grabOffset:[-30, -8],
      extractedAppearance:{ height:36, metrics:first.metrics } });
    expect([piece.xPercent, piece.yPercent]).toEqual([17.5, 19.6]);
    expect(getVisibleBookPieces(bookState)).toContain(piece);
    expect(prepareBookPieceSlotPresentations(bookState, 150).find(({ slot }) => slot.blank === blank)?.offsetX).toBe(0);
    onBookMouseOver(310, 160, 180, bookState);
    expect(layout.pieceLayouts.find(record => record.piece === piece)?.rect).toEqual({ x:300, y:150, width:80, height:36 });
    expect(prepareBookPieceSlotPresentations(bookState, 195).find(({ slot }) => slot.blank === blank)?.offsetX).not.toBe(0);
    endBookPieceDrag(bookState);
    expect(blank.playerAnswerIndex).toBe(-1);
    expect(getVisibleBookPieces(bookState)).toContain(piece);
    expect(prepareBookPieceSlotPresentations(bookState, 195).every(presentation => presentation.offsetX === 0)).toBe(true);
  });

  it('does not extract on a non-primary interaction', () => {
    const fixture = _createPreparedBook();
    _drop(fixture);
    expect(onBookMouseDown(500, 270, 150, fixture.bookState, false)).toBe(false);
    expect(fixture.blank.playerAnswerIndex).toBe(0);
    expect(fixture.bookState.pieceDragState).toBeNull();
  });

  it('keeps placement hidden after layout invalidation and cannot extract stale geometry', () => {
    const fixture = _createPreparedBook();
    _drop(fixture);
    invalidatePieceLayouts(fixture.bookState);
    expect(onBookMouseDown(500, 270, 150, fixture.bookState, true)).toBe(false);
    expect(fixture.blank.playerAnswerIndex).toBe(0);
    expect(getVisibleBookPieces(fixture.bookState)).toEqual([fixture.parkedPiece]);
  });

  it('switches the filled target directly to neutral presentation without affecting another shrinking slot', () => {
    const fixture = _createPreparedBook();
    const { bookState } = fixture;
    onBookMouseDown(500, 270, 0, bookState, true);
    prepareBookPieceSlotPresentations(bookState, 0);
    prepareBookPieceSlotPresentations(bookState, 120);
    onBookMouseOver(520, 270, 120, bookState);
    prepareBookPieceSlotPresentations(bookState, 120);
    prepareBookPieceSlotPresentations(bookState, 180);
    onBookMouseUp(520, 270, 180, bookState);
    expect(fixture.otherBlank.playerAnswerIndex).toBe(0);
    expect(bookState.pieceSlotTransitions).toHaveLength(1);
    const presentations = prepareBookPieceSlotPresentations(bookState, 180);
    expect(presentations).toHaveLength(1);
    expect(presentations[0].slot.blank).toBe(fixture.blank);
    expect(presentations[0].scale).toBeCloseTo(1.1);
    expect(presentations[0].offsetX).toBe(0);
  });
});