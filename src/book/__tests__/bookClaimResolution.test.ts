import { afterEach, describe, expect, it } from 'vitest';
import { createLayout, findControlRect } from '@/canvasControls';
import { clearSeed, setSeed } from '@/common/randUtil';
import { createAnswerSet } from '@/game/conclusions/answerSetUtil';
import ClozeBlank from '@/game/conclusions/types/ClozeBlank';
import { duplicateConclusion } from '@/game/conclusions/types/Conclusion';
import { claimBookConclusion, getConclusionPageInstructionText, updateBookClaimControls } from '../bookClaimControlUtil';
import { onBookMouseDown } from '../eventHandlers';
import { beginBookPieceDrag, findBookPieceAtPoint, getVisibleBookPieces } from '../pieceInteractionUtil';
import { generatePieceStack } from '../pieceGenerationUtil';
import BookPage from '../types/BookPage';
import { createDefaultBookState } from '../types/BookState';

function _createFixture(single:boolean = false) {
  // Distinct selected answers allow exact inventory associations; the second selection is initially wrong.
  const answerSet = createAnswerSet(['First', 'Second', 'Unused'], 'people');
  const blank:ClozeBlank = { type:'blank', answerSet, correctAnswerIndexes:[0], playerAnswerIndex:0 };
  const otherBlank:ClozeBlank = { ...blank, playerAnswerIndex:1 };
  const page:Extract<BookPage, { kind:'conclusion' }> = {
    kind:'conclusion', headingText:'', answerSetIdToPieceStyleNoMap:{ people:3 },
    conclusion:{ id:'synthetic', title:'Synthetic', parts:[blank, otherBlank], isComplete:false,
      isLocked:false, incorrectGuessCount:0, unlockConclusionIds:[], revealRoomIds:[] }
  };
  const bookState = createDefaultBookState();
  bookState.isVisible = true;
  bookState.pages = [page, { kind:'blank', headingText:'' }];
  bookState.pieceStack = generatePieceStack(bookState);

  // Prepared geometry is already in displayed coordinates, including the single-page shift once.
  const offset = single ? 200 : 0;
  const first = { page, pageNo:1, partIndex:0, blank, styleNo:3,
    rect:{ x:200 + offset, y:100, width:40, height:30 }, metrics:{ width:40, padding:2, fontSizePixels:12 } };
  const second = { ...first, partIndex:1, blank:otherBlank,
    rect:{ x:300 + offset, y:200, width:60, height:40 }, metrics:{ width:60, padding:3, fontSizePixels:14 } };
  const layout = { canvasWidth:1000, canvasHeight:600, rect:{ x:100, y:20, width:800, height:500 },
    isSinglePageView:single, pieceLayouts:[], pieceSlotLayouts:[first, second], pieceLayoutsPageNo:1 as number|null,
    controlLayout:createLayout() };
  bookState.layout = layout;
  return { bookState, page, blank, otherBlank, first, second, layout };
}

afterEach(clearSeed);

describe('book claim resolution', () => {
  it('marks a correct conclusion complete without ejecting answers or changing the inventory', () => {
    const { bookState, page, blank, otherBlank, layout } = _createFixture();
    otherBlank.correctAnswerIndexes.push(1);
    const stack = bookState.pieceStack;
    const placements = stack.map(piece => piece.placement);
    claimBookConclusion(bookState, 1);
    expect(page.conclusion.isComplete).toBe(true);
    expect(page.conclusion.incorrectGuessCount).toBe(0);
    expect([blank.playerAnswerIndex, otherBlank.playerAnswerIndex]).toEqual([0, 1]);
    expect(bookState.pieceStack).toBe(stack);
    stack.forEach((piece, i) => expect(piece.placement).toBe(placements[i]));
    expect(getVisibleBookPieces(bookState)).toEqual([stack[2]]);
    expect(layout.controlLayout.controls.find(control => control.id === 'claimLeft')?.isVisible).toBe(false);
  });

  it('increments once and ejects every assigned answer, including correct ones, preserving inventory order', () => {
    const { bookState, page, blank, otherBlank } = _createFixture();
    const stack = bookState.pieceStack;
    const unusedPosition = [stack[2].xPercent, stack[2].yPercent];
    setSeed(503);
    claimBookConclusion(bookState, 1);
    expect(page.conclusion.isComplete).toBe(false);
    expect(page.conclusion.incorrectGuessCount).toBe(1);
    expect([blank.playerAnswerIndex, otherBlank.playerAnswerIndex]).toEqual([-1, -1]);
    expect(stack.every(piece => piece.placement === null)).toBe(true);
    expect(bookState.pieceStack).toBe(stack);
    expect(getVisibleBookPieces(bookState)).toEqual(stack);
    expect([stack[2].xPercent, stack[2].yPercent]).toEqual(unusedPosition);
    expect(blank.answerSet.answers).toEqual(['First', 'Second', 'Unused']);
    expect([blank.correctAnswerIndexes, otherBlank.correctAnswerIndexes]).toEqual([[0], [0]]);
  });

  it('uses independently random directions with nonzero displacement proportional to slot height', () => {
    const { bookState, first, second, layout } = _createFixture();
    setSeed(503);
    claimBookConclusion(bookState, 1);
    const displacements = [first, second].map((slot, i) => {
      const piece = bookState.pieceStack[i];
      const x = layout.rect.x + layout.rect.width * piece.xPercent / 100;
      const y = layout.rect.y + layout.rect.height * piece.yPercent / 100;
      const dx = x - slot.rect.x - slot.rect.width / 2;
      const dy = y - slot.rect.y - slot.rect.height / 2;
      const distanceInSlotHeights = Math.hypot(dx, dy) / slot.rect.height;
      expect(Number.isFinite(distanceInSlotHeights)).toBe(true);
      expect(distanceInSlotHeights).toBeGreaterThan(0);
      return { distanceInSlotHeights, direction:Math.atan2(dy, dx) };
    });
    expect(displacements[0].distanceInSlotHeights).toBeCloseTo(displacements[1].distanceInSlotHeights);
    expect(displacements[0].direction).not.toBe(displacements[1].direction);
  });

  it('produces deterministic ejection positions when seeded', () => {
    const first = _createFixture();
    const second = _createFixture();
    setSeed(23);
    claimBookConclusion(first.bookState, 1);
    setSeed(23);
    claimBookConclusion(second.bookState, 1);
    expect(first.bookState.pieceStack.map(piece => [piece.xPercent, piece.yPercent]))
      .toEqual(second.bookState.pieceStack.map(piece => [piece.xPercent, piece.yPercent]));
  });

  it('makes ejected pieces immediately hittable and draggable without a draw', () => {
    const { bookState } = _createFixture();
    setSeed(503);
    claimBookConclusion(bookState, 1);
    const piece = bookState.pieceStack[0];
    const record = bookState.layout!.pieceLayouts.find(record => record.piece === piece)!;
    const x = record.rect.x + record.rect.width / 2;
    const y = record.rect.y + record.rect.height / 2;
    expect(findBookPieceAtPoint(bookState, x, y)).toBe(piece);
    expect(beginBookPieceDrag(bookState, x, y)).toBe(true);
  });

  it('applies the single-page display offset exactly once', () => {
    const spread = _createFixture();
    const single = _createFixture(true);
    setSeed(503);
    claimBookConclusion(spread.bookState, 1);
    setSeed(503);
    claimBookConclusion(single.bookState, 1);
    single.bookState.pieceStack.slice(0, 2).forEach((piece, i) => {
      expect(piece.xPercent).toBeCloseTo(spread.bookState.pieceStack[i].xPercent);
      expect(piece.yPercent).toBeCloseTo(spread.bookState.pieceStack[i].yPercent);
    });
  });

  it('routes a real hand-button click to claim only its conclusion', () => {
    const { bookState, page, otherBlank, layout } = _createFixture();
    otherBlank.correctAnswerIndexes.push(1);
    updateBookClaimControls(bookState);
    const rect = findControlRect(layout.controlLayout, 'claimLeft');
    expect(onBookMouseDown(rect.x + rect.width / 2, rect.y + rect.height / 2, 0, bookState, true)).toBe(false);
    expect(page.conclusion.isComplete).toBe(true);
    expect(bookState.animationKind).toBeNull();
    expect(bookState.isVisible).toBe(true);
    expect(bookState.pageNo).toBe(1);
  });

  it('ignores a repeated claim after a failed attempt has emptied the blanks', () => {
    const { bookState, page } = _createFixture();
    setSeed(1);
    claimBookConclusion(bookState, 1);
    const positions = bookState.pieceStack.map(piece => [piece.xPercent, piece.yPercent]);
    claimBookConclusion(bookState, 1);
    expect(page.conclusion.incorrectGuessCount).toBe(1);
    expect(bookState.pieceStack.map(piece => [piece.xPercent, piece.yPercent])).toEqual(positions);
  });

  it('preserves the counter when duplicating a conclusion', () => {
    const { page } = _createFixture();
    page.conclusion.incorrectGuessCount = 3;
    const copy = duplicateConclusion(page.conclusion);
    expect(copy.incorrectGuessCount).toBe(3);
    copy.incorrectGuessCount++;
    expect(page.conclusion.incorrectGuessCount).toBe(3);
  });

  it('ignores invalidated geometry without partially ejecting answers', () => {
    const { bookState, page, blank, otherBlank, layout } = _createFixture();
    layout.pieceLayoutsPageNo = null;
    claimBookConclusion(bookState, 1);
    expect(page.conclusion.incorrectGuessCount).toBe(0);
    expect([blank.playerAnswerIndex, otherBlank.playerAnswerIndex]).toEqual([0, 1]);
  });

  it('requires geometry for all blanks before changing any answer', () => {
    const { bookState, page, blank, otherBlank, layout } = _createFixture();
    layout.pieceSlotLayouts.pop();
    claimBookConclusion(bookState, 1);
    expect(page.conclusion.incorrectGuessCount).toBe(0);
    expect([blank.playerAnswerIndex, otherBlank.playerAnswerIndex]).toEqual([0, 1]);
  });

  it('rejects replaced page content at the same page number', () => {
    const { bookState, page } = _createFixture();
    bookState.pages[0] = { ...page };
    claimBookConclusion(bookState, 1);
    expect(page.conclusion.incorrectGuessCount).toBe(0);
  });

  it('does not claim the hidden neighboring page in single-page view', () => {
    const { bookState, page, layout } = _createFixture(true);
    bookState.pageNo = layout.pieceLayoutsPageNo = 2;
    claimBookConclusion(bookState, 1);
    expect(page.conclusion.incorrectGuessCount).toBe(0);
  });

  it('does not claim during a book animation or an active drag', () => {
    const { bookState, page } = _createFixture();
    bookState.animationKind = 'flipNext';
    claimBookConclusion(bookState, 1);
    bookState.animationKind = null;
    bookState.pieceDragState = { piece:bookState.pieceStack[2], grabOffset:[0, 0], extractedAppearance:null };
    claimBookConclusion(bookState, 1);
    expect(page.conclusion.incorrectGuessCount).toBe(0);
  });
});

describe('getConclusionPageInstructionText()', () => {
  it('instructs a new unfinished conclusion to fill its blanks', () => {
    const { page, blank } = _createFixture();
    blank.playerAnswerIndex = -1;
    expect(getConclusionPageInstructionText(page.conclusion)).toBe('Fill the blanks with your guesses.');
  });

  it('invites the first claim once all answers are filled', () => {
    const { page } = _createFixture();
    expect(getConclusionPageInstructionText(page.conclusion)).toBe('Claim this conclusion when you are confident.');
  });

  it('explains a failed claim while blanks are empty', () => {
    const { page, blank } = _createFixture();
    blank.playerAnswerIndex = -1;
    page.conclusion.incorrectGuessCount = 1;
    expect(getConclusionPageInstructionText(page.conclusion)).toBe('Your last guess was incorrect. You may try again.');
  });

  it('invites another claim after the player refills the blanks', () => {
    const { page } = _createFixture();
    page.conclusion.incorrectGuessCount = 2;
    expect(getConclusionPageInstructionText(page.conclusion)).toBe('Try claiming again, but only when you are ready.');
  });

  it('gives completion priority over attempt history', () => {
    const { page } = _createFixture();
    page.conclusion.isComplete = true;
    page.conclusion.incorrectGuessCount = 2;
    expect(getConclusionPageInstructionText(page.conclusion)).toBe('This conclusion is true.');
  });
});