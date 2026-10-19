/* This file calculates oscillating enlarged yell letters.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */
import { LetterTransform } from './types/LetterTransform';

const BASE_SCALE = 1.1;
const SCALE_AMPLITUDE = 0.1;
const PHASE_DURATION_MSECS = 110;

export function calcYellTextAnimationTransform(_text:string, _letterI:number, metaTime:number):Partial<LetterTransform> {
  return { scaleAmount:BASE_SCALE + Math.sin(metaTime / PHASE_DURATION_MSECS) * SCALE_AMPLITUDE };
}