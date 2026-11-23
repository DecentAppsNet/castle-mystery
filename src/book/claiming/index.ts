/* This file exposes book-claim controls, timing, presentation, and conclusion checks.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

export { claimBookConclusion, getConclusionPageInstructionText, updateBookClaim, updateBookClaimControls } from './bookClaimControlUtil';
export { calcBookClaimShakeOffset, calcBookClaimTiming } from './bookClaimTimingUtil';
export { calcBookClaimMessageAlpha, prepareBookClaimGlints } from './bookClaimPresentationUtil';
export { prepareBookClaimPieceFalls } from './bookClaimPieceFallUtil';
export { countRemainingRequiredConclusions, areAllRequiredConclusionsComplete, countShameMarks } from './conclusionUtil';