/* This file segments animation text and dispatches deterministic letter transformations.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { LetterTransform } from './types/LetterTransform';
import { TextAnimation } from './types/TextAnimation';
import { TextAnimationName } from './types/TextAnimationName';
import { calcTenseTextAnimationTransform } from './tenseTextAnimation';

const GRAPHEME_SEGMENTER = new Intl.Segmenter(undefined, { granularity:'grapheme' });

const ANIMATIONS:{ readonly [name in TextAnimationName]:TextAnimation } = { tense:calcTenseTextAnimationTransform };

export function isTextAnimationName(name:string):name is TextAnimationName {
  return Object.hasOwn(ANIMATIONS, name);
}

export function segmentTextAnimation(text:string):readonly string[] {
  return Array.from(GRAPHEME_SEGMENTER.segment(text), segment => segment.segment);
}

export function calcTextAnimationTransform(name:TextAnimationName, text:string,
    letterI:number, metaTime:number):Partial<LetterTransform> {
  return ANIMATIONS[name](text, letterI, metaTime);
}