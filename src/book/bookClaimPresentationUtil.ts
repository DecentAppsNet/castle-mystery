/* This file samples book-claim glints and message opacity without drawing or result mutations.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */
import { calcBookClaimTiming, FULL_REVOLUTION_RADIANS, SUCCESS_REVOLUTION_COUNT } from './bookClaimTimingUtil';
import BookClaimState from './types/BookClaimState';
import BookClaimGlint from './types/BookClaimGlint';
import BookState from './types/BookState';
import BookPage from './types/BookPage';

const GLINT_START_ANGLE_RADIANS = Math.PI / 2;

export function calcBookClaimMessageAlpha(bookState:Readonly<BookState>, page:BookPage, metaTime:number):number {
  // Only the claimed page fades, using the same absolute clock as every other claim stage.
  const claim = bookState.claimState;
  if (claim === null || claim.page !== page) return 1;
  const timing = calcBookClaimTiming(metaTime - claim.startedAt, claim.blanks.length, claim.correct);

  // Keep the message hidden through recovery, then reveal it before releasing the input lock.
  return timing.stage === 'fade' ? 1 - timing.envelope
    : timing.stage === 'message' ? timing.progress : timing.stage === 'done' ? 1 : 0;
}

export function prepareBookClaimGlints(claim:Readonly<BookClaimState>|null, metaTime:number):readonly BookClaimGlint[] {
  // Sample the captured sequence directly, never mutable readiness or old slot rectangles.
  if (claim === null) return [];
  const timing = calcBookClaimTiming(metaTime - claim.startedAt, claim.blanks.length, claim.correct);
  const blanks = timing.stage === 'inspection' ? [claim.blanks[timing.inspectedIndex!]]
    : timing.stage === 'success' ? claim.blanks : [];

  // Start at twelve o'clock, with one inspection revolution or repeated success revolutions.
  const revolutions = timing.stage === 'success' ? SUCCESS_REVOLUTION_COUNT : 1;
  const angle = GLINT_START_ANGLE_RADIANS + timing.progress * FULL_REVOLUTION_RADIANS * revolutions;
  return blanks.map(blank => ({ page:claim.page, blank, angle }));
}