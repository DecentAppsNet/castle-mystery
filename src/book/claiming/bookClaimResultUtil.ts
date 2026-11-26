/* This file applies book-claim results once, ejecting failed answers and removing unused successful pieces.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */
import { assertNonNullable } from 'decent-portal';
import { rand } from '@/common/randUtil';
import { calcBookClaimTiming, FULL_REVOLUTION_RADIANS } from './bookClaimTimingUtil';
import { detachBookPiece } from '../pieces';
import PieceSlotLayout from '../drawing/types/PieceSlotLayout';
import BookClaimState from './types/BookClaimState';
import BookState from '../types/BookState';
import { pushLevelChanges } from '@/persistence/levelChangeQueue';
import LevelChange from '@/persistence/types/LevelChange';
import { urlToFilename } from '@/common/urlUtil';

const EJECTION_DISTANCE_IN_LINE_HEIGHTS = .1;

function _ejectPiece(bookState:BookState, slot:PieceSlotLayout):void {
  const angle = rand() * FULL_REVOLUTION_RADIANS;
  const distance = slot.rect.height * EJECTION_DISTANCE_IN_LINE_HEIGHTS;
  detachBookPiece(bookState, slot, Math.cos(angle) * distance, Math.sin(angle) * distance);
}

function _getWorldChanges(bookState:BookState, claim:BookClaimState):LevelChange[] {
  const { conclusion, levelUrl } = claim.page;
  const changes:LevelChange[] = [];
  if (conclusion.revealRoomIds.length) changes.push({ kind:'revealRoom', roomIds:[...conclusion.revealRoomIds] });
  if (conclusion.id === 'identities') changes.push({ kind:'revealCharacterTitles' });
  const chapterEnd = bookState.pages.find(page => page.kind === 'chapterEnd' && page.levelUrl === levelUrl);
  if (!conclusion.isOptional && chapterEnd?.kind === 'chapterEnd'
    && chapterEnd.conclusions.every(other => other === conclusion || other.isOptional || other.isComplete)) {
    changes.push({ kind:'setLevelComplete' });
  }
  return changes;
}

function _completeClaim(bookState:BookState, claim:BookClaimState):void {
  claim.page.conclusion.isComplete = true;
  const unlockConclusionIds = new Set(claim.page.conclusion.unlockConclusionIds);
  for (const page of bookState.pages) {
    if (page.kind === 'conclusion' && page.levelUrl === claim.page.levelUrl
      && unlockConclusionIds.has(page.conclusion.id)) page.conclusion.isLocked = false;
  }
  bookState.pieceStack = bookState.pieceStack.filter(piece =>
    piece.kind === 'note' || piece.placement !== null || piece.pageI !== claim.conclusionPageI);
  if (bookState.layout) bookState.layout.pieceLayouts = bookState.layout.pieceLayouts.filter(({ piece }) =>
    bookState.pieceStack.includes(piece));
  claim.resultApplied = true;
}

export function applyBookClaimResults(bookState:BookState, claim:BookClaimState, elapsed:number, reportStorageError:(error:unknown) => void):void {
  // Apply the counter at failure entry or completion at success exit, never on presentation sampling.
  const timing = calcBookClaimTiming(elapsed, claim.blanks.length, claim.correct);
  if (!claim.resultApplied && !claim.publication && timing.shouldComplete) {
    const changes = _getWorldChanges(bookState, claim);
    if (!changes.length) _completeClaim(bookState, claim);
    else {
      claim.publication = 'pending';
      void pushLevelChanges(urlToFilename(claim.page.levelUrl), changes).then(() => {
        _completeClaim(bookState, claim);
        delete claim.publication;
      }, error => {
        claim.publication = 'failed';
        reportStorageError(error);
      });
    }
  }
  if (!claim.resultApplied && timing.dueEjectionCount > 0) {
    claim.page.conclusion.incorrectGuessCount++;
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