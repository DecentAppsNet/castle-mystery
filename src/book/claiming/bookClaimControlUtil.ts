/* This file manages book-only claim resolution, instruction text, and claim-control placement.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assert, assertNonNullable } from 'decent-portal';
import { hideControl, showControl, updateControlRect } from '@/canvasControls';
import ControlLayout from '@/canvasControls/types/ControlLayout';
import { countConclusionMistakes, isConclusionMissingAnswers } from '@/game/conclusions/conclusionUtil';
import Conclusion from '@/game/conclusions/types/Conclusion';
import ClozeBlank from '@/game/conclusions/types/ClozeBlank';
import { applyBookClaimResults } from './bookClaimResultUtil';
import { calcBookClaimTiming } from './bookClaimTimingUtil';
import { canClaimConclusion, countRemainingRequiredConclusions } from './conclusionUtil';
import { setPageNavigationButtonVisibility } from '../navigationUtil';
import { isCurrentPieceSlot } from '../pieces';
import Rect from '@/game/types/Rect';
import BookState from '../types/BookState';
import BookPage from '../types/BookPage';
import BookControlId from '../drawing/types/BookControlId';
import { findVisitChapterTarget } from '../chapterNavigationUtil';

function _canClaim(page:BookPage|undefined):boolean {
  return page?.kind === 'conclusion' && canClaimConclusion(page.conclusion);
}

export function getConclusionPageInstructionText(conclusion:Conclusion):string {
  // Completed conclusions no longer invite answer editing or another claim.
  if (conclusion.isComplete) return 'This conclusion is true.';

  // Share the readiness check and distinguish first attempts from retries.
  if (!isConclusionMissingAnswers(conclusion)) {
    return conclusion.incorrectGuessCount > 0
      ? 'Claim correctly or take a mark of shame.'
      : 'Claim this conclusion when you know truth.';
  }
  switch(conclusion.incorrectGuessCount) {
    case 0: return 'Fill the blanks with knowledge.';
    case 1: return 'Your claim was false. Try again.';
    default: return 'Your falsehood earned a mark of shame.';
  }
}

function _placeControl(id:BookControlId, rect:Rect, visible:boolean, controls:ControlLayout):void {
  // Avoid resetting hover on every frame when geometry has not changed.
  const previous = controls.controls.find(control => control.id === id)?.rect;
  if (!previous || previous.x !== rect.x || previous.y !== rect.y || previous.width !== rect.width || previous.height !== rect.height) {
    updateControlRect(id, rect, controls);
  }

  // Visibility changes also clear hover through the shared control helpers.
  if (visible) showControl(id, controls);
  else hideControl(id, controls);
}

export function updateBookClaimControls(bookState:Readonly<BookState>, loadedLevelUrl:string|null = null):void {
  // Work in unshifted book coordinates, just like the existing navigation controls.
  const { layout, pageNo, pages } = bookState;
  assertNonNullable(layout);
  const { rect, isSinglePageView, controlLayout } = layout;
  if (bookState.claimState !== null) {
    for (const control of controlLayout.controls) hideControl(control.id, controlLayout);
    controlLayout.hoveredControlId = null;
    return;
  }
  const leftPageNo = pageNo % 2 === 1 ? pageNo : pageNo - 1;
  const isInteractive = bookState.isVisible && bookState.animationKind === null;
  const leftPage = isInteractive && (!isSinglePageView || pageNo === leftPageNo) ? pages[leftPageNo - 1] : undefined;
  const canClaim = _canClaim(leftPage);
  const chapterEndPageI = isSinglePageView ? pageNo - 1 : leftPageNo;
  const chapterEndPage = pages[chapterEndPageI];
  const nextChapter = isInteractive && chapterEndPageI === pages.length - 1 && chapterEndPage?.kind === 'chapterEnd'
    && countRemainingRequiredConclusions(chapterEndPage.conclusions) === 0;
  const visitTarget = isInteractive ? findVisitChapterTarget(bookState, loadedLevelUrl) : null;
  const visitChapter = visitTarget !== null;

  // Keep the existing arrow endpoints and button dimensions; divide their center span into thirds when claiming.
  const areaWidth = rect.width / (isSinglePageView ? 2 : 1);
  const areaX = rect.x + (isSinglePageView && pageNo !== leftPageNo ? areaWidth : 0);
  const width = areaWidth * .05;
  const y = rect.y + rect.height * .99;
  const height = rect.height * .05;
  const claimX = isSinglePageView ? areaX + (areaWidth - width) / 3 : rect.x + rect.width / 4 - width / 2;
  let closeX = areaX + (areaWidth - width) * (isSinglePageView && canClaim ? 2 / 3 : .5);
  let visitX = visitTarget?.isLeftPage ? claimX : claimX + rect.width / 2;
  if (isSinglePageView && visitChapter) {
    const visitSlot = pageNo > 1 ? 1 : 0;
    const lastSlot = visitSlot + 1 + (pageNo < pages.length || nextChapter ? 1 : 0);
    const spacing = (areaWidth - width) / lastSlot;
    visitX = areaX + spacing * visitSlot;
    closeX = visitX + spacing;
  }
  _placeControl('closeBook', { x:closeX, y, width, height }, true, controlLayout);
  _placeControl('claim', { x:claimX, y, width, height }, canClaim, controlLayout);
  if (visitChapter || controlLayout.controls.some(control => control.id === 'visitChapter')) {
    _placeControl('visitChapter', { x:visitX, y, width, height }, visitChapter, controlLayout);
  }
  if (nextChapter || controlLayout.controls.some(control => control.id === 'nextChapter')) {
    _placeControl('nextChapter', { x:areaX + areaWidth - width, y, width, height }, nextChapter, controlLayout);
  }
}

export function claimBookConclusion(bookState:BookState, pageNo:number, metaTime:number):void {
  // Ignore stale clicks, noninteractive pages, and incomplete answer sets.
  const { layout } = bookState;
  const page = bookState.pages[pageNo - 1];
  if (bookState.claimState !== null || !bookState.isVisible || bookState.animationKind !== null || bookState.pieceDragState !== null
    || !layout || layout.pieceLayoutsPageNo !== bookState.pageNo || !_canClaim(page) || page.kind !== 'conclusion') return;

  // Capture all normal geometry before clearing answers can change text flow.
  const blanks = page.conclusion.parts.filter((part):part is ClozeBlank => part.type === 'blank');
  const slots = layout.pieceSlotLayouts.filter(slot => slot.page === page && slot.pageNo === pageNo
    && isCurrentPieceSlot(bookState, slot, layout.isSinglePageView));
  if (slots.length !== blanks.length || !blanks.every(blank => slots.some(slot => slot.blank === blank))) return;
  bookState.claimState = { conclusionPageI:pageNo - 1, page, blanks, correct:countConclusionMistakes(page.conclusion) === 0,
    startedAt:metaTime, resultApplied:false, ejectedCount:0 };
  bookState.hungryPieceSlot = null;
  bookState.pieceSlotTransitions = [];
  updateBookClaimControls(bookState);
}

export function updateBookClaim(bookState:BookState, metaTime:number, reportStorageError:(error:unknown) => void):void {
  // Discard obsolete ownership without rolling back results already applied.
  const claim = bookState.claimState;
  if (claim === null) return;
  const pageNo = claim.conclusionPageI + 1;
  const leftPageNo = bookState.pageNo % 2 === 1 ? bookState.pageNo : bookState.pageNo - 1;
  const blanks = claim.page.conclusion.parts.filter(part => part.type === 'blank');
  if (!bookState.isVisible || bookState.pages[claim.conclusionPageI] !== claim.page || (bookState.layout?.isSinglePageView
    ? pageNo !== bookState.pageNo : pageNo !== leftPageNo && pageNo !== leftPageNo + 1)
    || blanks.length !== claim.blanks.length || blanks.some((blank, i) => blank !== claim.blanks[i])) {
    bookState.claimState = null;
  } else {
    // Consume freshly collected normal geometry, including after resize, before loose-piece drawing.
    assert(bookState.animationKind === null);
    if (!bookState.layout || bookState.layout.pieceLayoutsPageNo !== bookState.pageNo) return;
    const elapsed = metaTime - claim.startedAt;
    applyBookClaimResults(bookState, claim, elapsed, reportStorageError);
    const timing = calcBookClaimTiming(elapsed, claim.blanks.length, claim.correct);
    if (timing.isDone && claim.publication !== 'pending') bookState.claimState = null;
  }

  // Restore ordinary controls after the message fade or external ownership cancellation.
  if (bookState.layout && bookState.claimState === null) setPageNavigationButtonVisibility(bookState);
  if (bookState.layout) updateBookClaimControls(bookState);
}