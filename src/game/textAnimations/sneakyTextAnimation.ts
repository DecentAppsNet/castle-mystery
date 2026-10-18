/* This file calculates occasional sneaky letter-scale pulses.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */
import { LetterTransform } from './types/LetterTransform';

const PHASE_DURATION_MSECS = 850;
const LETTER_PHASE_OFFSET = 2.39996;
const PULSE_SHARPNESS = 32;
const BASE_SCALE = 0.9;
const PULSE_SCALE_INCREASE = 0.2;

export function calcSneakyTextAnimationTransform(_text:string, letterI:number, metaTime:number):Partial<LetterTransform> {
  const pulse = Math.max(0, Math.sin(metaTime / PHASE_DURATION_MSECS + letterI * LETTER_PHASE_OFFSET)) ** PULSE_SHARPNESS;
  return { scaleAmount:BASE_SCALE + pulse * PULSE_SCALE_INCREASE };
}