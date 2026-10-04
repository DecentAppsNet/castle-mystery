/* This file calculates curtain presentation timing and scene eligibility from explicit timestamps.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { clamp } from '@/common/numberUtil';

const CLOSE_MS = 420;
const OPEN_MS = 620;
const VALANCE_CLOSE_MS = 140;
const VALANCE_OPEN_MS = 180;
const SETTLE_MS = 600;
const SETTLE_AMPLITUDE = 16;
const SETTLE_DAMPING = 8;
const SETTLE_FREQUENCY = 18;
const FULL_CLOSE_MS = VALANCE_CLOSE_MS + CLOSE_MS + SETTLE_MS;
/** Additional fully closed hold in milliseconds, concurrent with loading and measured after settling or startup closure. */
export const MIN_CLOSED_MS = FULL_CLOSE_MS;

/** Presentation phase and its start timestamp in milliseconds; closed starts when the fully closed view is established. */
export type CurtainTransition = Readonly<{
  phase:'open'|'closing'|'closed'|'opening',
  startedAt:number
}>;

type CurtainFrame = Readonly<{
  curtainAmount:number,
  valanceAmount:number,
  settlingDisplacement:number,
  canRenderScene:boolean,
  isTransitionComplete:boolean,
  transitionEndsAt:number|null,
  closedHoldEndsAt:number|null,
  isClosedHoldComplete:boolean
}>;

function _progress(elapsed:number, duration:number):number {
  return clamp(elapsed / duration, 0, 1);
}

function _smooth(progress:number):number {
  return progress * progress * (3 - 2 * progress);
}

function _easeOut(progress:number):number {
  return 1 - Math.pow(1 - progress, 3);
}

function _settlingDisplacement(elapsed:number):number {
  if (elapsed <= 0 || elapsed >= SETTLE_MS) return 0;
  const seconds = elapsed / 1000;
  return SETTLE_AMPLITUDE * Math.exp(-SETTLE_DAMPING * seconds) * Math.sin(SETTLE_FREQUENCY * seconds);
}

/**
 * Calculates overlay amounts, settling displacement, scene eligibility, and deadlines without advancing the phase.
 * Timestamps use the same monotonic millisecond clock, independent of gameplay time.
 * Settling displacement is unweighted; geometry applies bottom weighting. Hold completion does not imply load readiness.
 */
export function calculateCurtainFrame(transition:CurtainTransition, now:number):CurtainFrame {
  // Calculate deadlines independently of previous calculations or gameplay time.
  const { phase, startedAt } = transition;
  const elapsed = Math.max(0, now - startedAt);
  const transitionEndsAt = phase === 'closing' ? startedAt + FULL_CLOSE_MS
    : phase === 'opening' ? startedAt + OPEN_MS + VALANCE_OPEN_MS : null;
  const isTransitionComplete = transitionEndsAt !== null && now >= transitionEndsAt;
  const closedHoldEndsAt = phase === 'closed' ? startedAt + MIN_CLOSED_MS
    : phase === 'closing' ? startedAt + FULL_CLOSE_MS + MIN_CLOSED_MS : null;

  // Calculate valance-first closing and curtain-first opening without advancing the phase.
  let curtainAmount = phase === 'closed' ? 1 : 0;
  let valanceAmount = curtainAmount;
  let settlingDisplacement = 0;
  if (phase === 'closing') {
    curtainAmount = _smooth(_progress(elapsed - VALANCE_CLOSE_MS, CLOSE_MS));
    valanceAmount = _easeOut(_progress(elapsed, VALANCE_CLOSE_MS));
    settlingDisplacement = _settlingDisplacement(elapsed - VALANCE_CLOSE_MS - CLOSE_MS);
  } else if (phase === 'opening') {
    curtainAmount = 1 - _easeOut(_progress(elapsed, OPEN_MS));
    valanceAmount = 1 - _smooth(_progress(elapsed - OPEN_MS, VALANCE_OPEN_MS));
  }

  // Scene eligibility switches at full closure and at the start of opening.
  return {
    curtainAmount,
    valanceAmount,
    settlingDisplacement,
    canRenderScene:phase !== 'closed' && !(phase === 'closing' && isTransitionComplete),
    isTransitionComplete,
    transitionEndsAt,
    closedHoldEndsAt,
    isClosedHoldComplete:closedHoldEndsAt !== null && now >= closedHoldEndsAt
  };
}