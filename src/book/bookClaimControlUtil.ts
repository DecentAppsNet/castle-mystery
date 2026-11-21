/* This file manages book-only claim resolution, instruction text, and claim-control placement.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assertNonNullable } from 'decent-portal';
import { hideControl, showControl, updateControlRect } from '@/canvasControls';
import ControlLayout from '@/canvasControls/types/ControlLayout';
import { countConclusionMistakes, isConclusionMissingAnswers } from '@/game/conclusions/conclusionUtil';
import Conclusion from '@/game/conclusions/types/Conclusion';
import { applyBookClaimResults } from './bookClaimResultUtil';
import { calcBookClaimTiming } from './bookClaimTimingUtil';
import BookClaimState from './types/BookClaimState';
import { isCurrentPieceSlot } from './pieceSlotTargetUtil';
import PieceSlotLayout from './drawing/types/PieceSlotLayout';
import Rect from '@/game/types/Rect';
import BookState from './types/BookState';
import BookPage from './types/BookPage';
import BookControlId from './drawing/types/BookControlId';

function _canClaim(page:BookPage|undefined):boolean {
  return page?.kind === 'conclusion' && !page.conclusion.isLocked && !page.conclusion.isComplete
    && page.conclusion.parts.some(part => part.type === 'blank') && !isConclusionMissingAnswers(page.conclusion);
}

export function getConclusionPageInstructionText(conclusion:Conclusion):string {
  // Completed conclusions no longer invite answer editing or another claim.
  if (conclusion.isComplete) return 'This conclusion is true.';

  // Share the readiness check and distinguish first attempts from retries.
  if (!isConclusionMissingAnswers(conclusion)) {
    return conclusion.incorrectGuessCount > 0
      ? 'Try claiming again, but only when you are ready.'
      : 'Claim this conclusion when you are confident.';
  }
  return conclusion.incorrectGuessCount > 0
    ? 'Your last guess was incorrect. You may try again.'
    : 'Fill the blanks with your guesses.';
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

export function updateBookClaimControls(bookState:Readonly<BookState>):void {
  // Work in unshifted book coordinates, just like the existing navigation controls.
  const { layout, pageNo, pages } = bookState;
  assertNonNullable(layout);
  const { rect, isSinglePageView, controlLayout } = layout;
  const leftPageNo = pageNo % 2 === 1 ? pageNo : pageNo - 1;
  const isInteractive = bookState.isVisible && bookState.animationKind === null;
  const left = isInteractive && (!isSinglePageView || pageNo === leftPageNo) && _canClaim(pages[leftPageNo - 1]);
  const right = isInteractive && (!isSinglePageView || pageNo !== leftPageNo) && _canClaim(pages[leftPageNo]);

  // Keep the existing arrow endpoints and button dimensions; divide their center span into thirds when claiming.
  const areaWidth = rect.width / (isSinglePageView ? 2 : 1);
  const areaX = rect.x + (isSinglePageView && pageNo !== leftPageNo ? areaWidth : 0);
  const width = areaWidth * .05;
  const y = rect.y + rect.height * .99;
  const height = rect.height * .05;
  const claimX = isSinglePageView ? areaX + (areaWidth - width) / 3 : rect.x + rect.width / 4 - width / 2;
  const closeX = areaX + (areaWidth - width) * (isSinglePageView && (left || right) ? 2 / 3 : .5);
  _placeControl('closeBook', { x:closeX, y, width, height }, true, controlLayout);
  _placeControl('claimLeft', { x:claimX, y, width, height }, left, controlLayout);
  _placeControl('claimRight', { x:isSinglePageView ? claimX : claimX + rect.width / 2, y, width, height }, right, controlLayout);
}

function _applyBookClaim(bookState:BookState, page:Extract<BookPage, { kind:'conclusion' }>, slots:readonly PieceSlotLayout[], correct:boolean):void {
  // Preserve immediate resolution by applying all scheduled results at the sequence endpoint.
  const claim:BookClaimState = { page, blanks:slots.map(slot => slot.blank), correct, startedAt:0,
    resultApplied:false, ejectedCount:0 };
  applyBookClaimResults(bookState, claim, calcBookClaimTiming(0, claim.blanks.length, correct).totalDuration);

  // Remove obsolete feedback and refresh availability without invalidating ejected geometry.
  bookState.hungryPieceSlot = null;
  bookState.pieceSlotTransitions = [];
  updateBookClaimControls(bookState);
}

export function claimBookConclusion(bookState:BookState, pageNo:number):void {
  // Ignore stale clicks, noninteractive pages, and incomplete answer sets.
  const { layout } = bookState;
  const page = bookState.pages[pageNo - 1];
  if (!bookState.isVisible || bookState.animationKind !== null || bookState.pieceDragState !== null
    || !layout || layout.pieceLayoutsPageNo !== bookState.pageNo || !_canClaim(page) || page.kind !== 'conclusion') return;

  // Capture all normal geometry before clearing answers can change text flow.
  const blanks = page.conclusion.parts.filter(part => part.type === 'blank');
  const slots = layout.pieceSlotLayouts.filter(slot => slot.page === page && slot.pageNo === pageNo
    && isCurrentPieceSlot(bookState, slot, layout.isSinglePageView));
  if (slots.length !== blanks.length || !blanks.every(blank => slots.some(slot => slot.blank === blank))) return;
  _applyBookClaim(bookState, page, slots, countConclusionMistakes(page.conclusion) === 0);
}