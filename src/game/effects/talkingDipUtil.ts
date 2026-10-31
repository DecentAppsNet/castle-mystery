/* This file samples shared conversational head dips using stable per-speech phases.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assert } from 'decent-portal';
import { rand } from '@/common/randUtil';
import TalkingDipSampler from './types/TalkingDipSampler';

type TalkingDip = Readonly<{
  startTimeOffset:number,
  peakAngleOffsetRadians:number,
  returnDurationMsecs:number
}>;

const SMALL_DIP_ANGLE_RADIANS = Math.PI / 180;
const LARGE_DIP_ANGLE_RADIANS = Math.PI / 90;
const SMALL_DIP_DURATION_MSECS = 100;
const LARGE_DIP_DURATION_MSECS = 200;
const MIN_GAP_DURATION_MSECS = 20;
const MAX_GAP_DURATION_MSECS = 140;
const TALKING_DIPS_DURATION_MSECS = 60000;

let theTalkingDips:readonly TalkingDip[]|null = null;

function _createTalkingDips(duration:number):readonly TalkingDip[] {
  assert(duration > 0);
  const dips:TalkingDip[] = [];
  let timeOffset = 0;
  while (timeOffset < duration) {
    const isLargeDip = rand() < 0.35;
    const returnDurationMsecs = isLargeDip ? LARGE_DIP_DURATION_MSECS : SMALL_DIP_DURATION_MSECS;
    dips.push({
      startTimeOffset:timeOffset,
      peakAngleOffsetRadians:isLargeDip ? LARGE_DIP_ANGLE_RADIANS : SMALL_DIP_ANGLE_RADIANS,
      returnDurationMsecs
    });
    const gapDuration = MIN_GAP_DURATION_MSECS + Math.floor(rand() * (MAX_GAP_DURATION_MSECS - MIN_GAP_DURATION_MSECS + 1));
    timeOffset += returnDurationMsecs + gapDuration;
  }

  return dips;
}

function _getOrCreateTalkingDips():readonly TalkingDip[] {
  if (!theTalkingDips) theTalkingDips = _createTalkingDips(TALKING_DIPS_DURATION_MSECS);
  return theTalkingDips;
}

function _sampleDip(elapsed:number, phase:number):number {
  const dipPosition = (elapsed + phase) % TALKING_DIPS_DURATION_MSECS;
  const dips = _getOrCreateTalkingDips();
  assert(dipPosition >= 0 && dipPosition < TALKING_DIPS_DURATION_MSECS);
  assert(dips.length > 0);

  let headRotationOffsetRadians = 0;
  for (let dipI = dips.length - 1; dipI >= 0; --dipI) {
    const dip = dips[dipI];
    if (dipPosition < dip.startTimeOffset) continue;
    const dipElapsedTime = dipPosition - dip.startTimeOffset;
    if (dipElapsedTime <= dip.returnDurationMsecs) {
      headRotationOffsetRadians = dip.peakAngleOffsetRadians * (1 - dipElapsedTime / dip.returnDurationMsecs);
    }
    break;
  }

  return headRotationOffsetRadians;
}

export function createTalkingDipSampler():TalkingDipSampler {
  const phase = rand() * TALKING_DIPS_DURATION_MSECS;
  return elapsed => [{
    spriteKind:'head', transformType:'rotate', rotateRadians:_sampleDip(elapsed, phase)
  }];
}