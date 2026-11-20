/* This file evaluates transient book-slot drawing feedback using normal geometry and the meta-time clock.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { clamp, interpolateNumber } from '@/common/numberUtil';
import { isCurrentEmptyPieceSlot, updateBookPieceSlotTarget } from './pieceSlotTargetUtil';
import BookState from './types/BookState';
import PieceSlotPresentation from './types/PieceSlotPresentation';
import PieceSlotTransition from './types/PieceSlotTransition';

const SHAKE_PERIOD_MS = 180;
const SHAKE_HEIGHT_RATIO = .04;
const SCALE_DURATION_MS = 120;
const HUNGRY_SCALE = 1.2;

function _scaleAt(transition:PieceSlotTransition, metaTime:number):number {
  const progress = clamp((metaTime - transition.startedAt) / SCALE_DURATION_MS, 0, 1);
  return interpolateNumber(transition.fromScale, transition.toScale, progress * progress * (3 - 2 * progress));
}

export function prepareBookPieceSlotPresentations(bookState:BookState, metaTime:number):readonly PieceSlotPresentation[] {
  // Refresh targeting, then discard obsolete layout/view records even after a drag ends.
  const eligible = updateBookPieceSlotTarget(bookState);
  const { layout, pieceSlotTransitions:previous } = bookState;
  bookState.pieceSlotTransitions = [];
  if (!bookState.isVisible || bookState.animationKind !== null || !layout
    || layout.pieceLayoutsPageNo !== bookState.pageNo) return [];

  // Retarget each actual blank from its current scale, not a fixed endpoint.
  return layout.pieceSlotLayouts.filter(slot => isCurrentEmptyPieceSlot(bookState, slot, layout.isSinglePageView)).flatMap(slot => {
    let transition = previous.find(record => record.layout === layout && record.slot.page === slot.page
      && record.slot.blank === slot.blank && record.slot.partIndex === slot.partIndex && record.slot.pageNo === slot.pageNo);
    const scale = transition ? _scaleAt(transition, metaTime) : 1;
    const target = slot === bookState.hungryPieceSlot ? HUNGRY_SCALE : 1;
    if (target !== (transition?.toScale ?? 1)) {
      transition = { layout, slot, fromScale:scale, toScale:target, startedAt:metaTime };
    }
    if (transition && (scale !== 1 || target !== 1)) bookState.pieceSlotTransitions.push(transition);

    // Shrinking survives cancellation; shaking requires current eligibility and never applies to hungry slots.
    const isAwake = eligible.includes(slot) && slot !== bookState.hungryPieceSlot;
    return eligible.includes(slot) || scale !== 1 ? [{ slot, scale,
      offsetX:isAwake ? Math.sin(metaTime / SHAKE_PERIOD_MS * Math.PI * 2) * slot.rect.height * SHAKE_HEIGHT_RATIO : 0 }] : [];
  });
}