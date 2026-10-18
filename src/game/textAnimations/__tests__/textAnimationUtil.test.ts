import { describe, expect, it } from 'vitest';

import { calcTextAnimationTransform, isTextAnimationName, segmentTextAnimation } from '../index';

describe('textAnimations', () => {
  describe('isTextAnimationName()', () => {
    it('recognizes tense', () => {
      expect(isTextAnimationName('tense')).toBe(true);
    });

    it('recognizes the six new animations', () => {
      expect(isTextAnimationName('sneaky')).toBe(true);
      expect(isTextAnimationName('emphasis')).toBe(true);
      expect(isTextAnimationName('whisper')).toBe(true);
      expect(isTextAnimationName('yell')).toBe(true);
      expect(isTextAnimationName('flourish')).toBe(true);
      expect(isTextAnimationName('manic')).toBe(true);
    });

    it('rejects unknown names', () => {
      expect(isTextAnimationName('pulse')).toBe(false);
      expect(isTextAnimationName('Tense')).toBe(false);
    });

    it('rejects inherited object property names', () => {
      expect(isTextAnimationName('toString')).toBe(false);
      expect(isTextAnimationName('__proto__')).toBe(false);
    });
  });

  describe('segmentTextAnimation()', () => {
    it('segments ordinary letters', () => {
      expect(segmentTextAnimation('doom')).toEqual(['d', 'o', 'o', 'm']);
    });

    it('retains whitespace positions in span-local grapheme indices', () => {
      const graphemes = segmentTextAnimation('a \tb');

      expect(graphemes).toEqual(['a', ' ', '\t', 'b']);
      expect(graphemes[3]).toBe('b');
    });

    it('keeps combining accents and joined emoji together', () => {
      expect(segmentTextAnimation('e\u0301 \u{1F469}\u200D\u{1F4BB}!'))
        .toEqual(['e\u0301', ' ', '\u{1F469}\u200D\u{1F4BB}', '!']);
    });

    it('accepts an empty span', () => {
      expect(segmentTextAnimation('')).toEqual([]);
    });
  });

  describe('calcTextAnimationTransform()', () => {
    it('returns deterministic transforms for the same metaTime', () => {
      expect(calcTextAnimationTransform('tense', 'doom', 1, 35))
        .toEqual(calcTextAnimationTransform('tense', 'doom', 1, 35));
    });

    it('varies as metaTime advances', () => {
      expect(calcTextAnimationTransform('tense', 'doom', 1, 35))
        .not.toEqual(calcTextAnimationTransform('tense', 'doom', 1, 95));
    });

    it('repeats after its chosen 240 millisecond period', () => {
      const initial = calcTextAnimationTransform('tense', 'doom', 1, 35);
      const repeated = calcTextAnimationTransform('tense', 'doom', 1, 275);

      expect(repeated.translateXFraction).toBeCloseTo(initial.translateXFraction!);
      expect(repeated.translateYFraction).toBeCloseTo(initial.translateYFraction!);
    });

    it('uses the span-local letter index to vary neighboring letters', () => {
      expect(calcTextAnimationTransform('tense', 'doom', 0, 35))
        .not.toEqual(calcTextAnimationTransform('tense', 'doom', 1, 35));
    });

    it('returns small fractional translations without scaling or rotation', () => {
      const transform = calcTextAnimationTransform('tense', 'doom', 0, 30);

      expect(Math.abs(transform.translateXFraction!)).toBeGreaterThan(0);
      expect(Math.abs(transform.translateXFraction!)).toBeLessThanOrEqual(0.08);
      expect(Math.abs(transform.translateYFraction!)).toBeLessThanOrEqual(0.04);
      expect(transform.scaleAmount).toBeUndefined();
      expect(transform.rotateOffset).toBeUndefined();
    });
  });
});