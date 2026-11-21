/* This file calculates book-claim stages and owed results from absolute elapsed milliseconds.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */
import { assert } from 'decent-portal';
import { clamp } from '@/common/numberUtil';

export const FULL_REVOLUTION_RADIANS = Math.PI * 2;
const FADE_MS = 1000;
const INSPECTION_SLOT_MS = 1000;
const INSPECTION_MAX_MS = 5000;
const SUCCESS_MS = 500;
const FAILURE_SLOT_MS = 500;
const FAILURE_MAX_MS = 2500;
const RECOVERY_MS = 500;

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
  const totalDuration = recoveryStart + RECOVERY_MS;
  const stage = elapsed < FADE_MS ? 'fade' : elapsed < resultStart ? 'inspection'
    : elapsed < recoveryStart ? (correct ? 'success' : 'failure') : elapsed < totalDuration ? 'recovery' : 'done';

  // Sample local presentation while retaining cumulative events owed after skipped stages.
  const inspectedIndex = stage === 'inspection' ? _intervalIndex(elapsed, FADE_MS, inspectionInterval) : null;
  const start = stage === 'fade' ? 0 : stage === 'inspection' ? FADE_MS + inspectedIndex! * inspectionInterval
    : stage === 'success' || stage === 'failure' ? resultStart : recoveryStart;
  const duration = stage === 'fade' ? FADE_MS : stage === 'inspection' ? inspectionInterval
    : stage === 'success' ? SUCCESS_MS : stage === 'failure' ? slotCount * failureInterval : RECOVERY_MS;
  const progress = clamp((elapsed - start) / duration, 0, 1);
  return { stage, progress, inspectedIndex, totalDuration,
    envelope:stage === 'fade' ? progress : stage === 'recovery' ? 1 - progress : stage === 'done' ? 0 : 1,
    dueEjectionCount:!correct && elapsed >= resultStart ? Math.min(slotCount, _intervalIndex(elapsed, resultStart, failureInterval) + 1) : 0,
    shouldComplete:correct && elapsed >= recoveryStart, isDone:elapsed >= totalDuration } as const;
}