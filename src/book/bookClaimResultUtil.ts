/* This file applies book-claim results once, ejecting pieces from current normal slot geometry.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */
import { assertNonNullable } from 'decent-portal';
import { rand } from '@/common/randUtil';
import { calcBookClaimTiming, FULL_REVOLUTION_RADIANS } from './bookClaimTimingUtil';
import { detachBookPiece } from './pieceInteractionUtil';
import PieceSlotLayout from './drawing/types/PieceSlotLayout';
import BookClaimState from './types/BookClaimState';
import BookState from './types/BookState';

const EJECTION_DISTANCE_IN_LINE_HEIGHTS = .1;

function _ejectPiece(bookState:BookState, slot:PieceSlotLayout):void {
  const angle = rand() * FULL_REVOLUTION_RADIANS;
  const distance = slot.rect.height * EJECTION_DISTANCE_IN_LINE_HEIGHTS;
  detachBookPiece(bookState, slot, Math.cos(angle) * distance, Math.sin(angle) * distance);
}

export function applyBookClaimResults(bookState:BookState, claim:BookClaimState, elapsed:number):void {
  // Apply the counter at failure entry or completion at success exit, never on presentation sampling.
  const timing = calcBookClaimTiming(elapsed, claim.blanks.length, claim.correct);
  if (!claim.resultApplied && (timing.shouldComplete || timing.dueEjectionCount > 0)) {
    if (claim.correct) claim.page.conclusion.isComplete = true;
    else claim.page.conclusion.incorrectGuessCount++;
    claim.resultApplied = true;
  }

  // Re-resolve logical ownership against current geometry; never retain acceptance rectangles.
  while (claim.ejectedCount < timing.dueEjectionCount) {
    const slot = bookState.layout?.pieceSlotLayouts.find(slot => slot.page === claim.page && slot.blank === claim.blanks[claim.ejectedCount]);
    assertNonNullable(slot);
    _ejectPiece(bookState, slot);
    claim.ejectedCount++;
  }
}