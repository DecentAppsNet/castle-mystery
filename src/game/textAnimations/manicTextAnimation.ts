/* This file calculates independent abrupt manic letter transforms from stateless pseudo-random samples.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */
import { LetterTransform } from './types/LetterTransform';

const STEP_HASH_MULTIPLIER = 374761393;
const LETTER_HASH_MULTIPLIER = 668265263;
const MIX_HASH_MULTIPLIER = 1274126177;
const INITIAL_HASH_SHIFT = 13;
const FINAL_HASH_SHIFT = 16;
const UINT32_RANGE = 4294967296;
const LETTER_TIME_OFFSET_MSECS = 47;
const BASE_STEP_DURATION_MSECS = 95;
const STEP_DURATION_VARIANTS = 7;
const STEP_DURATION_INCREMENT_MSECS = 19;
const SAMPLE_MIDPOINT = 0.5;
const ROTATION_RANGE_RADIANS = Math.PI / 4;
const MIN_SCALE = 0.75;
const SCALE_RANGE = 0.6;
const X_TRANSLATION_RANGE_FRACTION = 0.3;
const Y_TRANSLATION_RANGE_FRACTION = 0.35;
const ROTATION_CHANNEL = 1;
const SCALE_CHANNEL = 2;
const X_TRANSLATION_CHANNEL = 3;
const Y_TRANSLATION_CHANNEL = 4;

function _sample(step:number, letterI:number, channel:number):number {
  let hash = Math.imul(step, STEP_HASH_MULTIPLIER) ^ Math.imul(letterI + 1, LETTER_HASH_MULTIPLIER)
    ^ Math.imul(channel, MIX_HASH_MULTIPLIER);
  hash = Math.imul(hash ^ (hash >>> INITIAL_HASH_SHIFT), MIX_HASH_MULTIPLIER);
  return ((hash ^ (hash >>> FINAL_HASH_SHIFT)) >>> 0) / UINT32_RANGE;
}

export function calcManicTextAnimationTransform(_text:string, letterI:number, metaTime:number):Partial<LetterTransform> {
  const step = Math.floor((metaTime + letterI * LETTER_TIME_OFFSET_MSECS)
    / (BASE_STEP_DURATION_MSECS + letterI % STEP_DURATION_VARIANTS * STEP_DURATION_INCREMENT_MSECS));
  return {
    rotateOffset:(_sample(step, letterI, ROTATION_CHANNEL) - SAMPLE_MIDPOINT) * ROTATION_RANGE_RADIANS,
    scaleAmount:MIN_SCALE + _sample(step, letterI, SCALE_CHANNEL) * SCALE_RANGE,
    translateXFraction:(_sample(step, letterI, X_TRANSLATION_CHANNEL) - SAMPLE_MIDPOINT) * X_TRANSLATION_RANGE_FRACTION,
    translateYFraction:(_sample(step, letterI, Y_TRANSLATION_CHANNEL) - SAMPLE_MIDPOINT) * Y_TRANSLATION_RANGE_FRACTION
  };
}