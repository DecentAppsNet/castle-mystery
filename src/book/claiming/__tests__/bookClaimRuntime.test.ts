// Nonvisual timed-claim contracts through real exported updater, input, navigation, and layout APIs.
import { afterEach, describe, expect, it } from 'vitest';
import { createLayout, findControlRect } from '@/canvasControls';
import { clearSeed, setSeed } from '@/common/randUtil';
import { createAnswerSet } from '@/game/conclusions/answerSetUtil';
import ClozeBlank from '@/game/conclusions/types/ClozeBlank';
import { claimBookConclusion, updateBookClaim, updateBookClaimControls } from '../bookClaimControlUtil';
import { calcBookClaimMessageAlpha } from '../bookClaimPresentationUtil';
import { onBookMouseDown, onBookMouseOver, onBookMouseUp, onBookMouseWheel } from '@/book/eventHandlers';
import { goNextPage, goPrevPage, setPageNavigationButtonVisibility } from '@/book/navigationUtil';
import { updatePieceStackForConclusionPages } from '@/book/pieces';
import { hideBook, shiftBookLeft, shiftBookRight, showBook } from '@/book/drawing/bookAnimationUtil';
import { updateBookLayoutAsNeeded, updateControlLayout } from '@/book/drawing/bookLayoutUtil';
import { startPageFlip } from '@/book/drawing/pages';
import BookLayout from '@/book/drawing/types/BookLayout';
import PieceSlotLayout from '@/book/drawing/types/PieceSlotLayout';
import BookPage from '@/book/types/BookPage';
import { createDefaultBookState } from '@/book/types/BookState';

const STARTED_AT = 12000;

function _createFixture(correct:boolean = false, pageNo:number = 1, conclusionId:string = 'runtime') {
  // Distinct selections make ownership and ordered ejection observable without drawing.
  const answerSet = createAnswerSet(['First', 'Second', 'Unused'], 'people');
  const blank:ClozeBlank = { type:'blank', answerSet, correctAnswerIndexes:[0], playerAnswerIndex:0 };
  const otherBlank:ClozeBlank = { type:'blank', answerSet, correctAnswerIndexes:[correct ? 1 : 0], playerAnswerIndex:1 };
  const page:Extract<BookPage, { kind:'conclusion' }> = {
    kind:'conclusion', headingText:'', chapterNo:1, answerSetIdToPieceStyleNoMap:{ people:3 }, layoutTweaks:[],
    conclusion:{ id:conclusionId, title:'Runtime', parts:[blank, { type:'text', text:' then ' }, otherBlank],
      isComplete:false, isLocked:false, isOptional:false, incorrectGuessCount:0, unlockConclusionIds:[], revealRoomIds:[] }
  };
  const bookState = createDefaultBookState();
  bookState.isVisible = true;
  bookState.pageNo = pageNo;
  bookState.pages = Array.from({ length:4 }, () => ({ kind:'blank', headingText:'', chapterNo:1 }));
  bookState.pages[pageNo - 1] = page;
  updatePieceStackForConclusionPages(bookState, 0);

  // These are normal displayed slot records, not animation geometry.
  const first:PieceSlotLayout = { page, pageNo, partIndex:0, blank, styleNo:3,
    rect:{ x:200, y:100, width:40, height:30 }, metrics:{ width:40, padding:2, fontSizePixels:12 } };
  const second:PieceSlotLayout = { ...first, partIndex:2, blank:otherBlank,
    rect:{ x:300, y:200, width:60, height:40 }, metrics:{ width:60, padding:3, fontSizePixels:14 } };
  const layout:BookLayout = { canvasWidth:1000, canvasHeight:600, rect:{ x:100, y:20, width:800, height:500 },
    isSinglePageView:false, pieceLayouts:[], pieceSlotLayouts:[first, second], pieceLayoutsPageNo:pageNo,
    controlLayout:createLayout() };
  bookState.layout = layout;
  updateControlLayout(bookState);
  layout.pieceSlotLayouts = [first, second];
  layout.pieceLayoutsPageNo = bookState.pageNo;
  setPageNavigationButtonVisibility(bookState);
  updateBookClaimControls(bookState);
  return { bookState, page, blank, otherBlank, first, second, layout };
}

function _expectHiddenControls(layout:BookLayout) {
  expect(layout.controlLayout.controls.map(control => control.id))
    .toEqual(expect.arrayContaining(['closeBook', 'nextPage', 'prevPage']));
  expect(layout.controlLayout.controls.every(control => !control.isVisible)).toBe(true);
  expect(layout.controlLayout.hoveredControlId).toBeNull();
}

afterEach(clearSeed);

describe('book claim runtime', () => {
  describe('updateBookClaim()', () => {
    it('starts message feedback at the scheduled recovery end, not a late rendered frame', () => {
      const { bookState, page, layout } = _createFixture(true);
      claimBookConclusion(bookState, 1, STARTED_AT);
      updateBookClaim(bookState, STARTED_AT + 6500);
      expect(bookState.claimState?.page).toBe(page);
      expect(bookState.claimState?.startedAt).toBe(STARTED_AT);
      expect(calcBookClaimMessageAlpha(bookState, page, STARTED_AT + 6500)).toBe(.5);
      _expectHiddenControls(layout);
      const before = structuredClone(bookState);
      onBookMouseDown(-100, -100, STARTED_AT + 6500, bookState, true);
      onBookMouseUp(0, 0, STARTED_AT + 6500, bookState);
      onBookMouseOver(0, 0, STARTED_AT + 6500, bookState);
      onBookMouseWheel(1, STARTED_AT + 6500, bookState);
      expect(bookState).toEqual(before);
      updateBookClaim(bookState, STARTED_AT + 7000);
      expect(bookState.claimState).toBeNull();
      expect(calcBookClaimMessageAlpha(bookState, page, STARTED_AT + 7000)).toBe(1);
      expect(layout.controlLayout.controls.find(control => control.id === 'closeBook')?.isVisible).toBe(true);
    });

    it('does not restart message feedback when a frame skips the entire fade-in', () => {
      const { bookState } = _createFixture(true);
      claimBookConclusion(bookState, 1, STARTED_AT);
      updateBookClaim(bookState, STARTED_AT + 1000000);
      expect(bookState.claimState).toBeNull();
    });

    it('discards message feedback on page replacement', () => {
      const { bookState } = _createFixture(true);
      claimBookConclusion(bookState, 1, STARTED_AT);
      updateBookClaim(bookState, STARTED_AT + 6000);
      expect(bookState.claimState).not.toBeNull();
      bookState.pages = [];
      updateBookClaim(bookState, STARTED_AT + 6100);
      expect(bookState.claimState).toBeNull();
    });

    it('discards message feedback on hiding or showing the book', () => {
      const hidden = _createFixture(true).bookState;
      claimBookConclusion(hidden, 1, STARTED_AT);
      updateBookClaim(hidden, STARTED_AT + 6500);
      hideBook(STARTED_AT + 6500, hidden);
      expect(hidden.claimState).toBeNull();
      const shown = _createFixture(true).bookState;
      claimBookConclusion(shown, 1, STARTED_AT);
      updateBookClaim(shown, STARTED_AT + 6500);
      showBook(STARTED_AT + 6500, shown);
      expect(shown.claimState).toBeNull();
    });

    it('captures failure without mutating answers or inventory and does not rejudge later correctness', () => {
      const { bookState, page, blank, otherBlank } = _createFixture();
      const stack = bookState.pieceStack;
      const before = structuredClone(stack);
      claimBookConclusion(bookState, 1, STARTED_AT);
      const claim = bookState.claimState!;
      expect(claim).toMatchObject({ conclusionPageI:0, correct:false, startedAt:STARTED_AT, resultApplied:false, ejectedCount:0 });
      expect(claim.page).toBe(page);
      expect(claim.blanks[0]).toBe(blank);
      expect(claim.blanks[1]).toBe(otherBlank);
      expect(page.conclusion.incorrectGuessCount).toBe(0);
      expect([blank.playerAnswerIndex, otherBlank.playerAnswerIndex]).toEqual([0, 1]);
      expect(bookState.pieceStack).toBe(stack);
      expect(stack).toEqual(before);
      otherBlank.correctAnswerIndexes.splice(0, 1, 1);
      const afterAuthorChange = structuredClone(stack);
      setSeed(503);
      updateBookClaim(bookState, STARTED_AT + 2999);
      expect(stack).toEqual(afterAuthorChange);
      expect(page.conclusion.incorrectGuessCount).toBe(0);
      updateBookClaim(bookState, STARTED_AT + 3000);
      expect(page.conclusion.incorrectGuessCount).toBe(1);
      expect(page.conclusion.isComplete).toBe(false);
      expect([blank.playerAnswerIndex, otherBlank.playerAnswerIndex]).toEqual([-1, 1]);
      expect(bookState.claimState).toBe(claim);
    });

    it('captures success and completes only at 5500, retaining the claim until message fade ends at 7000', () => {
      const { bookState, page, blank, otherBlank, layout } = _createFixture(true);
      const placements = bookState.pieceStack.map(piece => piece.placement);
      claimBookConclusion(bookState, 1, STARTED_AT);
      const claim = bookState.claimState!;
      otherBlank.correctAnswerIndexes.splice(0, 1, 0);
      updateBookClaim(bookState, STARTED_AT + 3000);
      updateBookClaim(bookState, STARTED_AT + 3499);
      expect(page.conclusion.isComplete).toBe(false);
      updateBookClaim(bookState, STARTED_AT + 5499);
      expect(page.conclusion.isComplete).toBe(false);
      updateBookClaim(bookState, STARTED_AT + 5500);
      expect(page.conclusion.isComplete).toBe(true);
      expect(claim.correct).toBe(true);
      expect(claim.resultApplied).toBe(true);
      expect(claim.ejectedCount).toBe(0);
      expect([blank.playerAnswerIndex, otherBlank.playerAnswerIndex]).toEqual([0, 1]);
      bookState.pieceStack.forEach((piece, i) => expect(piece.placement).toBe(placements[i]));
      _expectHiddenControls(layout);
      updateBookClaim(bookState, STARTED_AT + 5999);
      expect(bookState.claimState).toBe(claim);
      _expectHiddenControls(layout);
      updateBookClaim(bookState, STARTED_AT + 6000);
      expect(bookState.claimState).toBe(claim);
      _expectHiddenControls(layout);
      updateBookClaim(bookState, STARTED_AT + 6999);
      _expectHiddenControls(layout);
      updateBookClaim(bookState, STARTED_AT + 7000);
      expect(bookState.claimState).toBeNull();
      expect(page.conclusion.incorrectGuessCount).toBe(0);
      expect(layout.controlLayout.controls.find(control => control.id === 'claimLeft')?.isVisible).toBe(false);
      expect(layout.controlLayout.controls.find(control => control.id === 'nextPage')?.isVisible).toBe(true);
      expect(layout.controlLayout.controls.find(control => control.id === 'prevPage')?.isVisible).toBe(false);
      expect(layout.controlLayout.controls.find(control => control.id === 'closeBook')?.isVisible).toBe(true);
    });

    it('catches up skipped success and recovery without ejecting or repeating completion', () => {
      const { bookState, page, blank, otherBlank } = _createFixture(true);
      const placements = bookState.pieceStack.map(piece => piece.placement);
      claimBookConclusion(bookState, 1, STARTED_AT);
      updateBookClaim(bookState, STARTED_AT + 1000000);
      expect(bookState.claimState).toBeNull();
      expect(page.conclusion.isComplete).toBe(true);
      expect(page.conclusion.incorrectGuessCount).toBe(0);
      expect([blank.playerAnswerIndex, otherBlank.playerAnswerIndex]).toEqual([0, 1]);
      bookState.pieceStack.forEach((piece, i) => expect(piece.placement).toBe(placements[i]));
      const after = structuredClone(bookState);
      updateBookClaim(bookState, STARTED_AT + 1000000);
      expect(bookState).toEqual(after);
    });

    it('ejects in conclusion part order despite shuffled slots and repeats each timestamp without mutation', () => {
      const { bookState, page, blank, otherBlank, layout } = _createFixture();
      layout.pieceSlotLayouts = [...layout.pieceSlotLayouts].reverse();
      claimBookConclusion(bookState, 1, STARTED_AT);
      const claim = bookState.claimState!;
      claimBookConclusion(bookState, 1, STARTED_AT + 100);
      expect(bookState.claimState).toBe(claim);
      expect(claim.startedAt).toBe(STARTED_AT);
      setSeed(503);
      updateBookClaim(bookState, STARTED_AT + 3000);
      expect([blank.playerAnswerIndex, otherBlank.playerAnswerIndex]).toEqual([-1, 1]);
      expect(bookState.pieceStack[0].placement).toBeNull();
      expect(bookState.pieceStack[1].placement?.blank).toBe(otherBlank);
      const firstResult = structuredClone(bookState);
      updateBookClaim(bookState, STARTED_AT + 3000);
      updateBookClaim(bookState, STARTED_AT + 3499);
      expect(bookState).toEqual(firstResult);
      updateBookClaim(bookState, STARTED_AT + 3500);
      expect([blank.playerAnswerIndex, otherBlank.playerAnswerIndex]).toEqual([-1, -1]);
      expect(claim.ejectedCount).toBe(2);
      expect(page.conclusion.incorrectGuessCount).toBe(1);
      const secondResult = structuredClone(bookState);
      updateBookClaim(bookState, STARTED_AT + 3500);
      updateBookClaim(bookState, STARTED_AT + 3999);
      expect(bookState).toEqual(secondResult);
    });

    it('catches up a jump beyond failure sequence end once and restores first-spread availability', () => {
      const { bookState, page, blank, otherBlank, layout } = _createFixture();
      claimBookConclusion(bookState, 1, STARTED_AT);
      const claim = bookState.claimState!;
      setSeed(503);
      updateBookClaim(bookState, STARTED_AT + 1000000);
      expect(bookState.claimState).toBeNull();
      expect(claim.ejectedCount).toBe(2);
      expect(page.conclusion.incorrectGuessCount).toBe(1);
      expect([blank.playerAnswerIndex, otherBlank.playerAnswerIndex]).toEqual([-1, -1]);
      expect(layout.controlLayout.controls.find(control => control.id === 'prevPage')?.isVisible).toBe(false);
      expect(layout.controlLayout.controls.find(control => control.id === 'nextPage')?.isVisible).toBe(true);
      expect(layout.controlLayout.controls.find(control => control.id === 'closeBook')?.isVisible).toBe(true);
      expect(layout.controlLayout.controls.find(control => control.id === 'claimLeft')?.isVisible).toBe(false);
      const after = structuredClone(bookState);
      updateBookClaim(bookState, STARTED_AT + 1000000);
      expect(bookState).toEqual(after);
    });

    it('keeps every control hidden through failure message fade and restores last-spread availability at 5500', () => {
      const { bookState, page, first, layout } = _createFixture(false, 3);
      bookState.hungryPieceSlot = first;
      bookState.pieceSlotTransitions = [{ layout, slot:first, fromScale:1, toScale:1.2, startedAt:STARTED_AT - 100 }];
      layout.controlLayout.hoveredControlId = 'claimLeft';
      claimBookConclusion(bookState, 3, STARTED_AT);
      expect(bookState.claimState?.conclusionPageI).toBe(2);
      expect(bookState.hungryPieceSlot).toBeNull();
      expect(bookState.pieceSlotTransitions).toEqual([]);
      _expectHiddenControls(layout);
      setSeed(503);
      updateBookClaim(bookState, STARTED_AT + 3500);
      _expectHiddenControls(layout);
      updateBookClaim(bookState, STARTED_AT + 4000);
      expect(bookState.claimState).not.toBeNull();
      _expectHiddenControls(layout);
      updateBookClaim(bookState, STARTED_AT + 4499);
      _expectHiddenControls(layout);
      updateBookClaim(bookState, STARTED_AT + 4500);
      expect(bookState.claimState).not.toBeNull();
      expect(calcBookClaimMessageAlpha(bookState, page, STARTED_AT + 5000)).toBe(.5);
      updateBookClaim(bookState, STARTED_AT + 5499);
      _expectHiddenControls(layout);
      updateBookClaim(bookState, STARTED_AT + 5500);
      expect(bookState.claimState).toBeNull();
      expect(page.conclusion.incorrectGuessCount).toBe(1);
      expect(layout.controlLayout.controls.find(control => control.id === 'prevPage')?.isVisible).toBe(true);
      expect(layout.controlLayout.controls.find(control => control.id === 'nextPage')?.isVisible).toBe(false);
      expect(layout.controlLayout.controls.find(control => control.id === 'closeBook')?.isVisible).toBe(true);
    });

    it('claims only the clicked right page despite duplicate exact IDs, leaving the other conclusion and its pieces unchanged', () => {
      const { bookState, page, layout } = _createFixture();
      const neighbor = _createFixture(false, 1, page.conclusion.id);
      // Generate inventory in a valid spread, then copy it with this manual right-page fixture's ownership.
      bookState.pages[1] = neighbor.page;
      bookState.pieceStack.push(...neighbor.bookState.pieceStack.map(piece => ({ ...piece, conclusionPageI:1 })));
      layout.pieceSlotLayouts = [...layout.pieceSlotLayouts,
        { ...neighbor.first, pageNo:2 }, { ...neighbor.second, pageNo:2 }];
      updateBookClaimControls(bookState);
      const untouchedPieces = bookState.pieceStack.filter(piece => piece.conclusionPageI === 0);
      const beforePieces = structuredClone(untouchedPieces);
      const beforeConclusion = structuredClone(page.conclusion);
      const rect = findControlRect(layout.controlLayout, 'claimRight');
      onBookMouseDown(rect.x + rect.width / 2, rect.y + rect.height / 2, STARTED_AT, bookState, true);
      expect(bookState.claimState?.page).toBe(neighbor.page);
      expect(bookState.claimState?.conclusionPageI).toBe(1);
      claimBookConclusion(bookState, 1, STARTED_AT + 1);
      expect(bookState.claimState?.page).toBe(neighbor.page);
      setSeed(503);
      updateBookClaim(bookState, STARTED_AT + 4500);
      expect(neighbor.page.conclusion.incorrectGuessCount).toBe(1);
      expect([neighbor.blank.playerAnswerIndex, neighbor.otherBlank.playerAnswerIndex]).toEqual([-1, -1]);
      expect(page.conclusion).toEqual(beforeConclusion);
      expect(untouchedPieces).toEqual(beforePieces);
    });
  });

  describe('blocked input and navigation', () => {
    it('ignores hover, mouseup, wheel, slot clicks, control clicks, and outside dismissal without mutation', () => {
      const { bookState, first, layout } = _createFixture();
      const close = findControlRect(layout.controlLayout, 'closeBook');
      bookState.pieceStack.reverse();
      layout.pieceLayouts = [{ piece:bookState.pieceStack[0], rect:{ x:480, y:250, width:40, height:30 },
        metrics:first.metrics, isVisible:true }];
      claimBookConclusion(bookState, 1, STARTED_AT);
      const before = structuredClone(bookState);
      onBookMouseOver(close.x + 1, close.y + 1, STARTED_AT + 1, bookState);
      expect(bookState).toEqual(before);
      onBookMouseUp(first.rect.x + 1, first.rect.y + 1, STARTED_AT + 1, bookState);
      expect(bookState).toEqual(before);
      onBookMouseWheel(100, STARTED_AT + 1, bookState);
      expect(bookState).toEqual(before);
      expect(onBookMouseDown(first.rect.x + 1, first.rect.y + 1, STARTED_AT + 1, bookState, true)).toBe(false);
      expect(bookState).toEqual(before);
      expect(onBookMouseDown(500, 265, STARTED_AT + 1, bookState)).toBe(false);
      expect(bookState).toEqual(before);
      expect(onBookMouseDown(close.x + 1, close.y + 1, STARTED_AT + 1, bookState)).toBe(false);
      expect(bookState).toEqual(before);
      expect(onBookMouseDown(-100, -100, STARTED_AT + 1, bookState, true)).toBe(false);
      expect(bookState).toEqual(before);
    });

    it('blocks hover and mouseup before manually inserted drag movement and release branches', () => {
      const { bookState, first, layout } = _createFixture();
      claimBookConclusion(bookState, 1, STARTED_AT);
      const piece = bookState.pieceStack[2];
      layout.pieceLayouts = [{ piece, rect:{ x:480, y:250, width:40, height:30 }, metrics:first.metrics, isVisible:true }];
      bookState.pieceDragState = { piece, grabOffset:[0, 0], extractedAppearance:null };
      bookState.hungryPieceSlot = first;
      const before = structuredClone(bookState);
      onBookMouseOver(220, 115, STARTED_AT + 1, bookState);
      expect(bookState).toEqual(before);
      onBookMouseUp(220, 115, STARTED_AT + 1, bookState);
      expect(bookState).toEqual(before);
      expect(onBookMouseDown(220, 115, STARTED_AT + 1, bookState, true)).toBe(false);
      onBookMouseWheel(-100, STARTED_AT + 1, bookState);
      expect(bookState).toEqual(before);
    });

    it('refuses direct next/previous navigation, shifts, and flips without invalidating claim geometry', () => {
      const { bookState, layout } = _createFixture(false, 3);
      bookState.pages.push({ kind:'blank', headingText:'', chapterNo:1 }, { kind:'blank', headingText:'', chapterNo:1 });
      claimBookConclusion(bookState, 3, STARTED_AT);
      const before = structuredClone(bookState);
      goNextPage(STARTED_AT + 1, bookState);
      expect(bookState).toEqual(before);
      goPrevPage(STARTED_AT + 1, bookState);
      expect(bookState).toEqual(before);
      shiftBookLeft(STARTED_AT + 1, bookState);
      expect(bookState).toEqual(before);
      shiftBookRight(STARTED_AT + 1, bookState);
      expect(bookState).toEqual(before);
      startPageFlip(STARTED_AT + 1, bookState, 'flipNext');
      startPageFlip(STARTED_AT + 1, bookState, 'flipPrev');
      expect(bookState).toEqual(before);
      setPageNavigationButtonVisibility(bookState);
      updateBookClaimControls(bookState);
      _expectHiddenControls(layout);
    });
  });

  describe('claim ownership cancellation', () => {
    it('drops a replaced page before results without fabricating any result', () => {
      const { bookState, page, blank, otherBlank } = _createFixture();
      claimBookConclusion(bookState, 1, STARTED_AT);
      bookState.pages[0] = { ...page };
      updateBookClaim(bookState, STARTED_AT + 1000000);
      expect(bookState.claimState).toBeNull();
      expect(page.conclusion.incorrectGuessCount).toBe(0);
      expect(page.conclusion.isComplete).toBe(false);
      expect([blank.playerAnswerIndex, otherBlank.playerAnswerIndex]).toEqual([0, 1]);
    });

    it('drops a replaced page after one ejection without rolling back or inventing remaining results', () => {
      const { bookState, page, blank, otherBlank } = _createFixture();
      claimBookConclusion(bookState, 1, STARTED_AT);
      setSeed(503);
      updateBookClaim(bookState, STARTED_AT + 3000);
      const beforePieces = structuredClone(bookState.pieceStack);
      bookState.pages[0] = { ...page };
      updateBookClaim(bookState, STARTED_AT + 4500);
      expect(bookState.claimState).toBeNull();
      expect(page.conclusion.incorrectGuessCount).toBe(1);
      expect([blank.playerAnswerIndex, otherBlank.playerAnswerIndex]).toEqual([-1, 1]);
      expect(bookState.pieceStack).toEqual(beforePieces);
    });

    it('drops replaced blank ownership after one ejection, retaining only the already applied result', () => {
      const { bookState, page, blank, otherBlank } = _createFixture();
      claimBookConclusion(bookState, 1, STARTED_AT);
      const claim = bookState.claimState!;
      setSeed(503);
      updateBookClaim(bookState, STARTED_AT + 3000);
      const beforePieces = structuredClone(bookState.pieceStack);
      page.conclusion.parts[2] = { ...otherBlank };
      updateBookClaim(bookState, STARTED_AT + 1000000);
      expect(bookState.claimState).toBeNull();
      expect(page.conclusion.incorrectGuessCount).toBe(1);
      expect([blank.playerAnswerIndex, otherBlank.playerAnswerIndex]).toEqual([-1, 1]);
      expect(claim.ejectedCount).toBe(1);
      expect(bookState.pieceStack).toEqual(beforePieces);
    });

    it('drops ownership when another spread becomes displayed without finishing the remaining ejection', () => {
      const { bookState, page, blank, otherBlank } = _createFixture();
      claimBookConclusion(bookState, 1, STARTED_AT);
      setSeed(503);
      updateBookClaim(bookState, STARTED_AT + 3000);
      bookState.pageNo = 3;
      updateBookClaim(bookState, STARTED_AT + 4500);
      expect(bookState.claimState).toBeNull();
      expect(page.conclusion.incorrectGuessCount).toBe(1);
      expect([blank.playerAnswerIndex, otherBlank.playerAnswerIndex]).toEqual([-1, 1]);
    });

    it('drops a hidden single-page owner before applying deferred success', () => {
      const { bookState, page, layout } = _createFixture(true);
      layout.isSinglePageView = true;
      claimBookConclusion(bookState, 1, STARTED_AT);
      expect(bookState.claimState).not.toBeNull();
      bookState.pageNo = 2;
      updateBookClaim(bookState, STARTED_AT + 4000);
      expect(bookState.claimState).toBeNull();
      expect(page.conclusion.isComplete).toBe(false);
    });

    it('drops the transient claim when display is hidden, preserving partial results and remaining placement', () => {
      const { bookState, page, blank, otherBlank } = _createFixture();
      claimBookConclusion(bookState, 1, STARTED_AT);
      setSeed(503);
      updateBookClaim(bookState, STARTED_AT + 3000);
      bookState.isVisible = false;
      updateBookClaim(bookState, STARTED_AT + 4500);
      expect(bookState.claimState).toBeNull();
      expect(page.conclusion.incorrectGuessCount).toBe(1);
      expect([blank.playerAnswerIndex, otherBlank.playerAnswerIndex]).toEqual([-1, 1]);
      expect(bookState.pieceStack[1].placement?.blank).toBe(otherBlank);
    });

    it('hideBook discards the claim before starting dismissal and never applies remaining results', () => {
      const { bookState, page, blank, otherBlank, layout } = _createFixture();
      claimBookConclusion(bookState, 1, STARTED_AT);
      setSeed(503);
      updateBookClaim(bookState, STARTED_AT + 3000);
      hideBook(STARTED_AT + 3100, bookState);
      expect(bookState.claimState).toBeNull();
      expect(bookState.animationKind).toBe('disappear');
      expect(bookState.animationStartMetaTime).toBe(STARTED_AT + 3100);
      expect(layout.pieceLayoutsPageNo).toBeNull();
      updateBookClaim(bookState, STARTED_AT + 4500);
      expect(page.conclusion.incorrectGuessCount).toBe(1);
      expect([blank.playerAnswerIndex, otherBlank.playerAnswerIndex]).toEqual([-1, 1]);
    });

    it('showBook discards the claim before starting appearance without completing deferred success', () => {
      const { bookState, page, blank, otherBlank, layout } = _createFixture(true);
      claimBookConclusion(bookState, 1, STARTED_AT);
      showBook(STARTED_AT + 100, bookState);
      expect(bookState.claimState).toBeNull();
      expect(bookState.animationKind).toBe('appear');
      expect(bookState.animationStartMetaTime).toBe(STARTED_AT + 100);
      expect(layout.pieceLayoutsPageNo).toBeNull();
      updateBookClaim(bookState, STARTED_AT + 4000);
      expect(page.conclusion.isComplete).toBe(false);
      expect([blank.playerAnswerIndex, otherBlank.playerAnswerIndex]).toEqual([0, 1]);
    });
  });

  describe('normal geometry recollection', () => {
    it('pauses on an invalid marker even with stale slots present, then consumes recollected geometry', () => {
      const { bookState, page, blank, otherBlank, first, second, layout } = _createFixture();
      claimBookConclusion(bookState, 1, STARTED_AT);
      const claim = bookState.claimState!;
      layout.pieceLayoutsPageNo = null;
      setSeed(503);
      const paused = structuredClone(bookState);
      updateBookClaim(bookState, STARTED_AT + 4500);
      expect(bookState).toEqual(paused);
      layout.pieceLayoutsPageNo = 2;
      const wrongPage = structuredClone(bookState);
      updateBookClaim(bookState, STARTED_AT + 4500);
      expect(bookState).toEqual(wrongPage);
      layout.pieceSlotLayouts = [first, second];
      layout.pieceLayoutsPageNo = bookState.pageNo;
      updateBookClaim(bookState, STARTED_AT + 5500);
      expect(bookState.claimState).toBeNull();
      expect(claim.ejectedCount).toBe(2);
      expect(page.conclusion.incorrectGuessCount).toBe(1);
      expect([blank.playerAnswerIndex, otherBlank.playerAnswerIndex]).toEqual([-1, -1]);
    });

    it('resize preserves timing and hidden controls, pausing until fresh slots and marker are collected', () => {
      const { bookState, page, blank, otherBlank, first, second, layout } = _createFixture();
      claimBookConclusion(bookState, 1, STARTED_AT);
      const claim = bookState.claimState!;
      updateBookLayoutAsNeeded(1200, 700, { width:800, height:500 } as ImageBitmap, bookState);
      const resized = bookState.layout!;
      expect(resized).not.toBe(layout);
      expect(layout.pieceSlotLayouts).toEqual([]);
      expect(resized.pieceSlotLayouts).toEqual([]);
      expect(resized.pieceLayoutsPageNo).toBeNull();
      expect(bookState.claimState).toBe(claim);
      expect(claim.startedAt).toBe(STARTED_AT);
      _expectHiddenControls(resized);
      updateBookClaim(bookState, STARTED_AT + 3000);
      expect(claim.ejectedCount).toBe(0);
      expect(page.conclusion.incorrectGuessCount).toBe(0);
      _expectHiddenControls(resized);
      const freshFirst = { ...first, rect:{ ...first.rect, x:500, y:350, width:80, height:60 } };
      const freshSecond = { ...second, rect:{ ...second.rect, x:700, y:400, width:120, height:80 } };
      resized.pieceSlotLayouts = [freshSecond, freshFirst];
      resized.pieceLayoutsPageNo = bookState.pageNo;
      setSeed(503);
      updateBookClaim(bookState, STARTED_AT + 3500);
      expect([blank.playerAnswerIndex, otherBlank.playerAnswerIndex]).toEqual([-1, -1]);
      const record = resized.pieceLayouts.find(record => record.piece === bookState.pieceStack[1])!;
      expect(record.rect.width).toBe(freshSecond.rect.width);
      expect(record.rect.height).toBe(freshSecond.rect.height);
      expect(Math.hypot(record.rect.x - freshSecond.rect.x, record.rect.y - freshSecond.rect.y)).toBeGreaterThan(0);
      expect(Math.hypot(record.rect.x - freshSecond.rect.x, record.rect.y - freshSecond.rect.y)).toBeLessThan(freshSecond.rect.height);
      expect(claim.startedAt).toBe(STARTED_AT);
      _expectHiddenControls(resized);
      updateBookClaim(bookState, STARTED_AT + 5500);
      expect(bookState.claimState).toBeNull();
    });

    it('control relayout preserves partial results and pauses later ejection until recollection', () => {
      const { bookState, page, blank, otherBlank, first, second, layout } = _createFixture();
      claimBookConclusion(bookState, 1, STARTED_AT);
      const claim = bookState.claimState!;
      setSeed(503);
      updateBookClaim(bookState, STARTED_AT + 3000);
      updateControlLayout(bookState);
      expect(bookState.claimState).toBe(claim);
      expect(claim.startedAt).toBe(STARTED_AT);
      expect(layout.pieceSlotLayouts).toEqual([]);
      expect(layout.pieceLayoutsPageNo).toBeNull();
      _expectHiddenControls(layout);
      updateBookClaim(bookState, STARTED_AT + 4500);
      expect(bookState.claimState).toBe(claim);
      expect(claim.ejectedCount).toBe(1);
      expect([blank.playerAnswerIndex, otherBlank.playerAnswerIndex]).toEqual([-1, 1]);
      const freshSecond = { ...second, rect:{ ...second.rect, x:600, y:300 } };
      layout.pieceSlotLayouts = [first, freshSecond];
      layout.pieceLayoutsPageNo = bookState.pageNo;
      updateBookClaim(bookState, STARTED_AT + 5500);
      expect(bookState.claimState).toBeNull();
      expect(page.conclusion.incorrectGuessCount).toBe(1);
      expect([blank.playerAnswerIndex, otherBlank.playerAnswerIndex]).toEqual([-1, -1]);
      const record = layout.pieceLayouts.find(record => record.piece === bookState.pieceStack[1])!;
      expect(record.rect.x).toBeGreaterThan(second.rect.x + second.rect.width);
      expect(record.rect.y).toBeGreaterThan(second.rect.y + second.rect.height);
    });
  });
});