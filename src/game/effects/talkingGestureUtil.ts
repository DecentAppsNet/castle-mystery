/* This file samples shared conversational arm gestures using stable per-speech phases.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assert, assertNonNullable } from 'decent-portal';
import { rand, randIntInRange } from '@/common/randUtil';
import SpriteOverride from './types/SpriteOverride';
import TalkingGestureSampler from './types/TalkingGestureSampler';

type TalkingGesture = Readonly<{
  startTimeOffset:number,
  durationMsecs:number,
  targetAngleRadians:number
}>;

const TALKING_GESTURES_DURATION_MSECS = 60000;
const MIN_PHASE_SEPARATION_MSECS = 10000;
const REST_TOGGLE_PROBABILITY = 0.2;
const MIN_REST_DURATION_MSECS = 200;
const MAX_REST_DURATION_MSECS = 2000;
const MIN_GESTURE_DURATION_MSECS = 100;
const MAX_GESTURE_DURATION_MSECS = 1000;
const TARGET_ANGLES_RADIANS = [15, 18, 45, 48, 90, 93].map(degrees => degrees * Math.PI / 180);

let theTalkingGestures:readonly TalkingGesture[]|null = null;

function _createTalkingGestures():readonly TalkingGesture[] {
  const gestures:TalkingGesture[] = [];
  let startTimeOffset = 0;
  let resting = true;
  while (startTimeOffset < TALKING_GESTURES_DURATION_MSECS) {
    if (rand() < REST_TOGGLE_PROBABILITY) resting = !resting;
    const targetAngleRadians = resting ? 0 : TARGET_ANGLES_RADIANS[randIntInRange(0, TARGET_ANGLES_RADIANS.length)];
    const duration = resting ? randIntInRange(MIN_REST_DURATION_MSECS, MAX_REST_DURATION_MSECS + 1)
      : randIntInRange(MIN_GESTURE_DURATION_MSECS, MAX_GESTURE_DURATION_MSECS + 1);
    const durationMsecs = Math.min(duration, TALKING_GESTURES_DURATION_MSECS - startTimeOffset);
    gestures.push({ startTimeOffset, durationMsecs, targetAngleRadians });
    startTimeOffset += durationMsecs;
  }

  return gestures;
}

function _getOrCreateTalkingGestures():readonly TalkingGesture[] {
  if (!theTalkingGestures) theTalkingGestures = _createTalkingGestures();
  return theTalkingGestures;
}

function _sampleGesture(gestures:readonly TalkingGesture[], elapsed:number, phase:number):number {
  const position = (elapsed + phase) % TALKING_GESTURES_DURATION_MSECS;
  const gesture = gestures.find(segment => position >= segment.startTimeOffset
    && position < segment.startTimeOffset + segment.durationMsecs);
  assertNonNullable(gesture);
  return gesture.targetAngleRadians;
}

export function createTalkingGestureSampler(speechDuration:number):TalkingGestureSampler {
  const gestures = _getOrCreateTalkingGestures();
  assert(MIN_PHASE_SEPARATION_MSECS + 1 < TALKING_GESTURES_DURATION_MSECS - MIN_PHASE_SEPARATION_MSECS);
  const nearPhase = randIntInRange(0, TALKING_GESTURES_DURATION_MSECS);
  const displacement = randIntInRange(MIN_PHASE_SEPARATION_MSECS + 1,
    TALKING_GESTURES_DURATION_MSECS - MIN_PHASE_SEPARATION_MSECS);
  const phases = [nearPhase, (nearPhase + displacement) % TALKING_GESTURES_DURATION_MSECS];

  return elapsed => {
    if (elapsed < 0 || elapsed >= speechDuration) return [];
    return (['nearArm', 'farArm'] as const).flatMap<SpriteOverride>((spriteKind, armI) => {
      const angle = _sampleGesture(gestures, elapsed, phases[armI]);
      return angle === 0 ? [] : [{ spriteKind, transformType:'rotate', rotateRadians:-angle }];
    });
  };
}