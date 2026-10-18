/* This file calculates a subtle animated emphasis tilt.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */
import { LetterTransform } from './types/LetterTransform';

const BASE_ROTATION_RADIANS = 0.12;
const ROTATION_AMPLITUDE_RADIANS = 0.025;
const PHASE_DURATION_MSECS = 400;
const SCALE_AMOUNT = 1.1;

export function calcEmphasisTextAnimationTransform(_text:string, _letterI:number, metaTime:number):Partial<LetterTransform> {
  return { 
    rotateOffset:BASE_ROTATION_RADIANS + Math.sin(metaTime / PHASE_DURATION_MSECS) * ROTATION_AMPLITUDE_RADIANS,
    scaleAmount:SCALE_AMOUNT
  };
}