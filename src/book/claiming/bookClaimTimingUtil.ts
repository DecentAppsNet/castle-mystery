/* This file calculates book-claim stages and owed results from absolute elapsed milliseconds.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */
import { assert } from 'decent-portal';
import { clamp } from '@/common/numberUtil';

export const FULL_REVOLUTION_RADIANS = Math.PI * 2;
const FADE_MS = 1000;
const INSPECTION_SLOT_MS = 1000;
const INSPECTION_MAX_MS = 5000;
export const SUCCESS_REVOLUTION_COUNT = 5;
const SUCCESS_REVOLUTION_MS = 500;
const SUCCESS_MS = SUCCESS_REVOLUTION_MS * SUCCESS_REVOLUTION_COUNT;
const FAILURE_SLOT_MS = 500;
const FAILURE_MAX_MS = 2500;
const RECOVERY_MS = 500;
const MESSAGE_FADE_IN_MS = 1000;
const SHAKE_PERIOD_MS = 180;
const SHAKE_HEIGHT_RATIO = .003;

function _intervalIndex(elapsed:number, start:number, interval:number):number {
  const index = Math.floor((elapsed - start) / interval);
  return elapsed >= start + (index + 1) * interval ? index + 1 : index;
}

export function calcBookClaimTiming(elapsed:number, slotCount:number, correct:boolean) {
  // Derive every boundary independently of previous samples.
  assert(Number.isInteger(slotCount) && slotCount > 0);
  const inspectionInterval = Math.min(INSPECTION_SLOT_MS, INSPECTION_MAX_MS / slotCount);
  const failureInterval = Math.min(FAILURE_SLOT_MS, FAILURE_MAX_MS / slotCount);
  const resultStart = FADE_MS + slotCount * inspectionInterval;
  const recoveryStart = resultStart + (correct ? SUCCESS_MS : slotCount * failureInterval);
  const messageStart = recoveryStart + RECOVERY_MS;
  const totalDuration = messageStart + MESSAGE_FADE_IN_MS;
  const stage = elapsed < FADE_MS ? 'fade' : elapsed < resultStart ? 'inspection'
    : elapsed < recoveryStart ? (correct ? 'success' : 'failure') : elapsed < messageStart ? 'recovery'
    : elapsed < totalDuration ? 'message' : 'done';

  // Sample local presentation while retaining cumulative events owed after skipped stages.
  const inspectedIndex = stage === 'inspection' ? _intervalIndex(elapsed, FADE_MS, inspectionInterval) : null;
  const start = stage === 'fade' ? 0 : stage === 'inspection' ? FADE_MS + inspectedIndex! * inspectionInterval
    : stage === 'success' || stage === 'failure' ? resultStart : stage === 'recovery' ? recoveryStart : messageStart;
  const duration = stage === 'fade' ? FADE_MS : stage === 'inspection' ? inspectionInterval
    : stage === 'success' ? SUCCESS_MS : stage === 'failure' ? slotCount * failureInterval
    : stage === 'recovery' ? RECOVERY_MS : MESSAGE_FADE_IN_MS;
  const progress = clamp((elapsed - start) / duration, 0, 1);
  return { stage, progress, inspectedIndex, totalDuration,
    envelope:stage === 'fade' ? progress : stage === 'recovery' ? 1 - progress : stage === 'message' || stage === 'done' ? 0 : 1,
    dueEjectionCount:!correct && elapsed >= resultStart ? Math.min(slotCount, _intervalIndex(elapsed, resultStart, failureInterval) + 1) : 0,
    shouldComplete:correct && elapsed >= recoveryStart, isDone:elapsed >= totalDuration } as const;
}

export function calcBookClaimShakeOffset(elapsed:number, slotCount:number, correct:boolean, bookHeight:number):number {
  const { envelope } = calcBookClaimTiming(elapsed, slotCount, correct);
  if (envelope === 0) return 0;
  return Math.sin(elapsed / SHAKE_PERIOD_MS * FULL_REVOLUTION_RADIANS) * bookHeight * SHAKE_HEIGHT_RATIO * envelope;
}