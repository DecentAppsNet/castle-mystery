import { afterEach, describe, expect, it } from 'vitest';
import { createLayout, findControlRect } from '@/canvasControls';
import { clearSeed, setSeed } from '@/common/randUtil';
import { createAnswerSet } from '@/game/conclusions/answerSetUtil';
import ClozeBlank from '@/game/conclusions/types/ClozeBlank';
import { duplicateConclusion } from '@/game/conclusions/types/Conclusion';
import { claimBookConclusion, getConclusionPageInstructionText, updateBookClaim, updateBookClaimControls } from '../bookClaimControlUtil';
import { onBookMouseDown } from '@/book/eventHandlers';
import { beginBookPieceDrag, findBookPieceAtPoint, getVisibleBookPieces, generatePieceStack,
  updatePieceStackForConclusionPages } from '@/book/pieces';
import { applyBookClaimResults } from '../bookClaimResultUtil';
import PieceLayout from '@/book/drawing/types/PieceLayout';
import BookClaimState from '../types/BookClaimState';
import BookPage from '@/book/types/BookPage';
import { createDefaultBookState } from '@/book/types/BookState';

function _createFixture(single:boolean = false) {
  // Distinct selected answers allow exact inventory associations; the second selection is initially wrong.
  const answerSet = createAnswerSet(['First', 'Second', 'Unused'], 'people');
  const blank:ClozeBlank = { type:'blank', answerSet, correctAnswerIndexes:[0], playerAnswerIndex:0 };
  const otherBlank:ClozeBlank = { ...blank, playerAnswerIndex:1 };
  const page:Extract<BookPage, { kind:'conclusion' }> = {
    kind:'conclusion', headingText:'', chapterNo:1, answerSetIdToPieceStyleNoMap:{ people:3 }, layoutTweaks:[],
    conclusion:{ id:'synthetic', title:'Synthetic', parts:[blank, otherBlank], isComplete:false,
      isLocked:false, isOptional:false, incorrectGuessCount:0, unlockConclusionIds:[], revealRoomIds:[] }
  };
  const bookState = createDefaultBookState();
  bookState.isVisible = true;
  bookState.pages = [page, { kind:'blank', headingText:'', chapterNo:1 }];
  bookState.pieceStack = generatePieceStack(bookState);

  // Prepared geometry is already in displayed coordinates, including the single-page shift once.
  const offset = single ? 200 : 0;
  const first = { page, pageNo:1, partIndex:0, blank, styleNo:3,
    rect:{ x:200 + offset, y:100, width:40, height:30 }, metrics:{ width:40, padding:2, fontSizePixels:12 } };
  const second = { ...first, partIndex:1, blank:otherBlank,
    rect:{ x:300 + offset, y:200, width:60, height:40 }, metrics:{ width:60, padding:3, fontSizePixels:14 } };
  const layout = { canvasWidth:1000, canvasHeight:600, rect:{ x:100, y:20, width:800, height:500 },
    isSinglePageView:single, pieceLayouts:[] as readonly PieceLayout[], pieceSlotLayouts:[first, second], pieceLayoutsPageNo:1 as number|null,
    controlLayout:createLayout() };
  bookState.layout = layout;
  updateBookClaimControls(bookState);
  return { bookState, page, blank, otherBlank, first, second, layout };
}

function _createClaimFixture(correct:boolean = false) {
  const fixture = _createFixture();
  const claim:BookClaimState = { page:fixture.page, conclusionPageI:0, blanks:[fixture.blank, fixture.otherBlank],
    correct, startedAt:123, resultApplied:false, ejectedCount:0 };
  return { ...fixture, claim };
}

afterEach(clearSeed);

describe('book claim resolution', () => {
  it('unlocks matching conclusions only in the successfully claimed chapter', () => {
    const { bookState, page, otherBlank } = _createFixture();
    otherBlank.correctAnswerIndexes.push(1);
    page.conclusion = { ...page.conclusion, unlockConclusionIds:['next', 'another'] };
    const next = { ...page, conclusion:{ ...duplicateConclusion(page.conclusion), id:'next', isLocked:true } };
    const another = { ...next, conclusion:{ ...duplicateConclusion(next.conclusion), id:'another' } };
    const unrelated = { ...next, conclusion:{ ...duplicateConclusion(next.conclusion), id:'unrelated' } };
    const otherChapter = { ...next, chapterNo:2, conclusion:duplicateConclusion(next.conclusion) };
    bookState.pages.push(next, another, unrelated, otherChapter);

    claimBookConclusion(bookState, 1, 123);
    updateBookClaim(bookState, 4623);
    expect(next.conclusion.isLocked).toBe(true);
    updateBookClaim(bookState, 5623);

    expect(page.conclusion.isComplete).toBe(true);
    expect(next.conclusion.isLocked).toBe(false);
    expect(another.conclusion.isLocked).toBe(false);
    expect(unrelated.conclusion.isLocked).toBe(true);
    expect(otherChapter.conclusion.isLocked).toBe(true);
    expect(bookState.pages[2]).toBe(next);
  });

  it('does not unlock conclusions after an unsuccessful claim', () => {
    const { bookState, page } = _createFixture();
    page.conclusion = { ...page.conclusion, unlockConclusionIds:['next'] };
    const next = { ...page, conclusion:{ ...duplicateConclusion(page.conclusion), id:'next', isLocked:true } };
    bookState.pages.push(next);

    claimBookConclusion(bookState, 1, 123);
    updateBookClaim(bookState, 5623);

    expect(page.conclusion.isComplete).toBe(false);
    expect(next.conclusion.isLocked).toBe(true);
  });

  it('marks a correct conclusion complete, retaining assigned pieces and removing unused pieces', () => {
    const { bookState, page, blank, otherBlank, layout } = _createFixture();
    otherBlank.correctAnswerIndexes.push(1);
    const stack = bookState.pieceStack;
    const placements = stack.map(piece => piece.placement);
    claimBookConclusion(bookState, 1, 123);
    updateBookClaim(bookState, 5623);
    expect(page.conclusion.isComplete).toBe(true);
    expect(page.conclusion.incorrectGuessCount).toBe(0);
    expect([blank.playerAnswerIndex, otherBlank.playerAnswerIndex]).toEqual([0, 1]);
    expect(bookState.pieceStack).toEqual(stack.slice(0, 2));
    stack.forEach((piece, i) => expect(piece.placement).toBe(placements[i]));
    expect(getVisibleBookPieces(bookState)).toEqual([]);
    expect(layout.controlLayout.controls.find(control => control.id === 'claimLeft')?.isVisible).toBe(false);
  });

  it('captures an appended duplicate-ID page index and cleans up only its unused inventory', () => {
    const { bookState, page, layout } = _createFixture();
    const appended = _createFixture();
    appended.otherBlank.correctAnswerIndexes.push(1);
    expect(appended.page.conclusion.id).toBe(page.conclusion.id);
    const earlierPieces = [...bookState.pieceStack];
    const before = structuredClone(earlierPieces);
    bookState.pages.push(appended.page, { kind:'blank', headingText:'', chapterNo:1 });
    updatePieceStackForConclusionPages(bookState, 2);
    const assigned = bookState.pieceStack.slice(3, 5);
    bookState.pageNo = layout.pieceLayoutsPageNo = 3;
    layout.pieceSlotLayouts = [{ ...appended.first, pageNo:3 }, { ...appended.second, pageNo:3 }];
    claimBookConclusion(bookState, 3, 123);
    expect(bookState.claimState).toMatchObject({ conclusionPageI:2, page:appended.page, correct:true });
    updateBookClaim(bookState, 5623);
    expect(appended.page.conclusion.isComplete).toBe(true);
    expect(page.conclusion.isComplete).toBe(false);
    expect(bookState.pieceStack).toEqual([...earlierPieces, ...assigned]);
    expect(earlierPieces).toEqual(before);
    expect(bookState.pieceStack[0]).toBe(earlierPieces[0]);
    expect(bookState.pieceStack[3]).toBe(assigned[0]);
  });

  it('increments once and ejects every assigned answer, including correct ones, preserving inventory order', () => {
    const { bookState, page, blank, otherBlank } = _createFixture();
    const stack = bookState.pieceStack;
    const unusedPosition = [stack[2].xPercent, stack[2].yPercent];
    setSeed(503);
    claimBookConclusion(bookState, 1, 123);
    updateBookClaim(bookState, 4623);
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
    claimBookConclusion(bookState, 1, 123);
    updateBookClaim(bookState, 4623);
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
    claimBookConclusion(first.bookState, 1, 123);
    updateBookClaim(first.bookState, 4623);
    setSeed(23);
    claimBookConclusion(second.bookState, 1, 123);
    updateBookClaim(second.bookState, 4623);
    expect(first.bookState.pieceStack.map(piece => [piece.xPercent, piece.yPercent]))
      .toEqual(second.bookState.pieceStack.map(piece => [piece.xPercent, piece.yPercent]));
  });

  it('makes ejected pieces immediately hittable and draggable without a draw', () => {
    const { bookState } = _createFixture();
    setSeed(503);
    claimBookConclusion(bookState, 1, 123);
    updateBookClaim(bookState, 4623);
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
    claimBookConclusion(spread.bookState, 1, 123);
    updateBookClaim(spread.bookState, 4623);
    setSeed(503);
    claimBookConclusion(single.bookState, 1, 123);
    updateBookClaim(single.bookState, 4623);
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
    expect(onBookMouseDown(rect.x + rect.width / 2, rect.y + rect.height / 2, 123, bookState, true)).toBe(false);
    expect(bookState.claimState).toMatchObject({ page, conclusionPageI:0, startedAt:123, correct:true, resultApplied:false });
    expect(page.conclusion.isComplete).toBe(false);
    updateBookClaim(bookState, 5622);
    expect(page.conclusion.isComplete).toBe(false);
    updateBookClaim(bookState, 5623);
    expect(page.conclusion.isComplete).toBe(true);
    expect(bookState.animationKind).toBeNull();
    expect(bookState.isVisible).toBe(true);
    expect(bookState.pageNo).toBe(1);
  });

  it('ignores a repeated claim after a failed attempt has emptied the blanks', () => {
    const { bookState, page } = _createFixture();
    setSeed(1);
    claimBookConclusion(bookState, 1, 123);
    updateBookClaim(bookState, 4623);
    const positions = bookState.pieceStack.map(piece => [piece.xPercent, piece.yPercent]);
    claimBookConclusion(bookState, 1, 5000);
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
    claimBookConclusion(bookState, 1, 123);
    expect(page.conclusion.incorrectGuessCount).toBe(0);
    expect([blank.playerAnswerIndex, otherBlank.playerAnswerIndex]).toEqual([0, 1]);
  });

  it('requires geometry for all blanks before changing any answer', () => {
    const { bookState, page, blank, otherBlank, layout } = _createFixture();
    layout.pieceSlotLayouts.pop();
    claimBookConclusion(bookState, 1, 123);
    expect(page.conclusion.incorrectGuessCount).toBe(0);
    expect([blank.playerAnswerIndex, otherBlank.playerAnswerIndex]).toEqual([0, 1]);
  });

  it('rejects replaced page content at the same page number', () => {
    const { bookState, page } = _createFixture();
    bookState.pages[0] = { ...page };
    claimBookConclusion(bookState, 1, 123);
    expect(page.conclusion.incorrectGuessCount).toBe(0);
  });

  it('does not claim the hidden neighboring page in single-page view', () => {
    const { bookState, page, layout } = _createFixture(true);
    bookState.pageNo = layout.pieceLayoutsPageNo = 2;
    claimBookConclusion(bookState, 1, 123);
    expect(page.conclusion.incorrectGuessCount).toBe(0);
  });

  it('does not claim during a book animation or an active drag', () => {
    const { bookState, page } = _createFixture();
    bookState.animationKind = 'flipNext';
    claimBookConclusion(bookState, 1, 123);
    bookState.animationKind = null;
    bookState.pieceDragState = { piece:bookState.pieceStack[2], grabOffset:[0, 0], extractedAppearance:null };
    claimBookConclusion(bookState, 1, 123);
    expect(page.conclusion.incorrectGuessCount).toBe(0);
  });
});

describe('applyBookClaimResults()', () => {
  it('initializes books without an active claim', () => {
    expect(createDefaultBookState().claimState).toBeNull();
  });

  it('defers failure mutations until result entry, then ejects in captured blank order once', () => {
    const { bookState, claim, page, blank, otherBlank, layout } = _createClaimFixture();
    layout.pieceSlotLayouts.reverse();
    setSeed(503);
    applyBookClaimResults(bookState, claim, 2999);
    expect(page.conclusion.incorrectGuessCount).toBe(0);
    expect([blank.playerAnswerIndex, otherBlank.playerAnswerIndex]).toEqual([0, 1]);
    applyBookClaimResults(bookState, claim, 3000);
    expect(page.conclusion.incorrectGuessCount).toBe(1);
    expect([blank.playerAnswerIndex, otherBlank.playerAnswerIndex]).toEqual([-1, 1]);
    expect(claim.ejectedCount).toBe(1);
    const position = [bookState.pieceStack[0].xPercent, bookState.pieceStack[0].yPercent];
    applyBookClaimResults(bookState, claim, 3000);
    applyBookClaimResults(bookState, claim, 3499);
    expect(claim.ejectedCount).toBe(1);
    expect([bookState.pieceStack[0].xPercent, bookState.pieceStack[0].yPercent]).toEqual(position);
    applyBookClaimResults(bookState, claim, 3500);
    expect([blank.playerAnswerIndex, otherBlank.playerAnswerIndex]).toEqual([-1, -1]);
    expect(claim.ejectedCount).toBe(2);
    expect(page.conclusion.incorrectGuessCount).toBe(1);
    expect(claim.startedAt).toBe(123);
  });

  it('uses refreshed slot geometry for later ejections', () => {
    const { bookState, claim, second, layout } = _createClaimFixture();
    setSeed(503);
    applyBookClaimResults(bookState, claim, 3000);
    const refreshed = { ...second, rect:{ ...second.rect, x:600, y:300 } };
    layout.pieceSlotLayouts = [refreshed];
    applyBookClaimResults(bookState, claim, 3500);
    const record = layout.pieceLayouts.find(record => record.piece === bookState.pieceStack[1])!;
    expect(record.rect.width).toBe(refreshed.rect.width);
    expect(record.rect.height).toBe(refreshed.rect.height);
    expect(record.rect.x).toBeGreaterThan(second.rect.x + second.rect.width);
    expect(record.rect.y).toBeGreaterThan(second.rect.y + second.rect.height);
  });

  it('catches up every failure result once even when all stages are skipped', () => {
    const { bookState, claim, page, blank, otherBlank } = _createClaimFixture();
    setSeed(503);
    applyBookClaimResults(bookState, claim, 1000000);
    const positions = bookState.pieceStack.map(piece => [piece.xPercent, piece.yPercent]);
    applyBookClaimResults(bookState, claim, 1000000);
    expect(page.conclusion.incorrectGuessCount).toBe(1);
    expect([blank.playerAnswerIndex, otherBlank.playerAnswerIndex]).toEqual([-1, -1]);
    expect(claim.ejectedCount).toBe(2);
    expect(bookState.pieceStack.map(piece => [piece.xPercent, piece.yPercent])).toEqual(positions);
  });

  it('completes success only at its interval end, preserving captured answers and placements', () => {
    const { bookState, claim, page, blank, otherBlank, layout } = _createClaimFixture(true);
    const placements = bookState.pieceStack.map(piece => piece.placement);
    applyBookClaimResults(bookState, claim, 3000);
    applyBookClaimResults(bookState, claim, 3499);
    expect(page.conclusion.isComplete).toBe(false);
    applyBookClaimResults(bookState, claim, 5499);
    expect(page.conclusion.isComplete).toBe(false);
    applyBookClaimResults(bookState, claim, 5500);
    expect(page.conclusion.isComplete).toBe(true);
    layout.pieceSlotLayouts = [];
    applyBookClaimResults(bookState, claim, 1000000);
    expect(page.conclusion.incorrectGuessCount).toBe(0);
    expect([blank.playerAnswerIndex, otherBlank.playerAnswerIndex]).toEqual([0, 1]);
    expect(bookState.pieceStack.map(piece => piece.placement)).toEqual(placements.slice(0, 2));
    expect(claim.ejectedCount).toBe(0);
    expect(claim.resultApplied).toBe(true);
  });
});

describe('getConclusionPageInstructionText()', () => {
  it('instructs a new unfinished conclusion to fill its blanks', () => {
    const { page, blank } = _createFixture();
    blank.playerAnswerIndex = -1;
    expect(getConclusionPageInstructionText(page.conclusion)).toBe('Fill the blanks with knowledge.');
  });

  it('invites the first claim once all answers are filled', () => {
    const { page } = _createFixture();
    expect(getConclusionPageInstructionText(page.conclusion)).toBe('Claim this conclusion when you know truth.');
  });

  it('explains a failed claim while blanks are empty', () => {
    const { page, blank } = _createFixture();
    blank.playerAnswerIndex = -1;
    page.conclusion.incorrectGuessCount = 1;
    expect(getConclusionPageInstructionText(page.conclusion)).toBe('Your claim was false. Try again.');
  });

  it('invites another claim after the player refills the blanks', () => {
    const { page } = _createFixture();
    page.conclusion.incorrectGuessCount = 2;
    expect(getConclusionPageInstructionText(page.conclusion)).toBe('Claim correctly or take a mark of shame.');
  });

  it('gives completion priority over attempt history', () => {
    const { page } = _createFixture();
    page.conclusion.isComplete = true;
    page.conclusion.incorrectGuessCount = 2;
    expect(getConclusionPageInstructionText(page.conclusion)).toBe('This conclusion is true.');
  });
});