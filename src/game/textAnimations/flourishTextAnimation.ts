/* This file calculates a repeating left-to-right flourish wave with a resting interval.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */
import { LetterTransform } from './types/LetterTransform';

const LETTERS_PER_SECOND = 9;
const MSECS_PER_SECOND = 1000;
const REST_DURATION_MSECS = 1200;
const WAVE_DURATION_MSECS = 400;
const WAVE_HEIGHT_FRACTION = 0.45;

export function calcFlourishTextAnimationTransform(text:string, letterI:number, metaTime:number):Partial<LetterTransform> {
  const cycleTime = metaTime % (text.length * MSECS_PER_SECOND / LETTERS_PER_SECOND + REST_DURATION_MSECS);
  const progress = (cycleTime - letterI * MSECS_PER_SECOND / LETTERS_PER_SECOND) / WAVE_DURATION_MSECS;
  const wave = progress >= 0 && progress <= 1 ? Math.sin(progress * Math.PI) : 0;
  return { translateYFraction:-WAVE_HEIGHT_FRACTION * wave };
}