/* This file calculates deterministic looping tense text animation transforms.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { LetterTransform } from './types/LetterTransform';

const TENSE_PERIOD_MSECS = 240;

export function calcTenseTextAnimationTransform(_text:string, letterI:number, metaTime:number):Partial<LetterTransform> {
  const phase = (metaTime % TENSE_PERIOD_MSECS) / TENSE_PERIOD_MSECS * Math.PI * 2 + letterI * 2.4;
  return {
    translateXFraction:Math.sin(phase) * 0.04,
    translateYFraction:Math.cos(phase * 2) * 0.04
  };
}