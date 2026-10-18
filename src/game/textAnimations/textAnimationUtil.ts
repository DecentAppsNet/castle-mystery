/* This file segments animation text and dispatches deterministic letter transformations.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { LetterTransform } from './types/LetterTransform';
import { TextAnimation } from './types/TextAnimation';
import { TextAnimationName } from './types/TextAnimationName';
import { calcTenseTextAnimationTransform } from './tenseTextAnimation';
import { calcSneakyTextAnimationTransform } from './sneakyTextAnimation';
import { calcEmphasisTextAnimationTransform } from './emphasisTextAnimation';
import { calcWhisperTextAnimationTransform } from './whisperTextAnimation';
import { calcYellTextAnimationTransform } from './yellTextAnimation';
import { calcFlourishTextAnimationTransform } from './flourishTextAnimation';
import { calcManicTextAnimationTransform } from './manicTextAnimation';

const GRAPHEME_SEGMENTER = new Intl.Segmenter(undefined, { granularity:'grapheme' });

const ANIMATIONS:{ readonly [name in TextAnimationName]:TextAnimation } = {
  tense:calcTenseTextAnimationTransform, sneaky:calcSneakyTextAnimationTransform,
  emphasis:calcEmphasisTextAnimationTransform, whisper:calcWhisperTextAnimationTransform,
  yell:calcYellTextAnimationTransform, flourish:calcFlourishTextAnimationTransform, manic:calcManicTextAnimationTransform
};

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