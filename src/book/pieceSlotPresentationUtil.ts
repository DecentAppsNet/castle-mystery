/* This file evaluates transient book-slot drawing feedback using normal geometry and the meta-time clock.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { updateBookPieceSlotTarget } from './pieceSlotTargetUtil';
import BookState from './types/BookState';
import PieceSlotPresentation from './types/PieceSlotPresentation';

const SHAKE_PERIOD_MS = 180;
const SHAKE_HEIGHT_RATIO = .04;

export function prepareBookPieceSlotPresentations(bookState:BookState, metaTime:number):readonly PieceSlotPresentation[] {
  const eligible = updateBookPieceSlotTarget(bookState);
  return eligible.map(slot => ({
    slot,
    offsetX:slot === bookState.hungryPieceSlot ? 0
      : Math.sin(metaTime / SHAKE_PERIOD_MS * Math.PI * 2) * slot.rect.height * SHAKE_HEIGHT_RATIO
  }));
}