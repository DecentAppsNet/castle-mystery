/* This file samples staggered success-piece falls from current canvas geometry without mutating inventory.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */
import { clamp } from '@/common/numberUtil';
import { calcBookClaimTiming } from './bookClaimTimingUtil';
import PieceLayout from './drawing/types/PieceLayout';
import BookClaimState from './types/BookClaimState';

const FALL_STAGGER_RATIO = .6;
const FALL_ACCELERATION = 4;

export function prepareBookClaimPieceFalls(layouts:readonly PieceLayout[], claim:Readonly<BookClaimState>|null,
  metaTime:number, canvasHeight:number):readonly PieceLayout[] {
  // Derive stagger order from stable loose-piece order, scoped to the captured conclusion.
  if (claim === null) return layouts;
  const timing = calcBookClaimTiming(metaTime - claim.startedAt, claim.blanks.length, claim.correct);
  if (timing.stage !== 'success') return layouts;
  const falling = layouts.filter(({ piece }) => piece.placement === null && piece.conclusionId === claim.page.conclusion.id);

  // Every path ends below the current canvas by success exit, with exponentially increasing velocity.
  return layouts.map(layout => {
    const index = falling.indexOf(layout);
    if (index === -1) return layout;
    const delay = FALL_STAGGER_RATIO * index / Math.max(1, falling.length - 1);
    const progress = clamp((timing.progress - delay) / (1 - delay), 0, 1);
    const distanceRatio = Math.expm1(FALL_ACCELERATION * progress) / Math.expm1(FALL_ACCELERATION);
    const { rect } = layout;
    return { ...layout, rect:{ ...rect, y:rect.y + (canvasHeight + rect.height - rect.y) * distanceRatio } };
  });
}