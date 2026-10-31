import { beforeEach, describe, expect, it } from 'vitest';

import { rand, setSeed } from '@/common/randUtil';
import { createTalkingDipSampler } from '../talkingDipUtil';

describe('talkingDipUtil', () => {
  beforeEach(() => setSeed(407));

  describe('createTalkingDipSampler()', () => {
    it('defers singleton initialization to first sampling and reuses it thereafter', () => {
      rand();
      const afterPhase = rand();
      setSeed(407);
      const sample = createTalkingDipSampler();
      expect(rand()).toBe(afterPhase);

      setSeed(902);
      const withoutInitialization = rand();
      setSeed(902);
      sample(0);
      expect(rand()).not.toBe(withoutInitialization);

      setSeed(407);
      sample(100);
      createTalkingDipSampler();
      expect(rand()).toBe(afterPhase);
    });

    it('returns a finite head rotation without arm overrides', () => {
      const sample = createTalkingDipSampler();
      const overrides = sample(500);
      expect(overrides).toEqual([
        { spriteKind:'head', transformType:'rotate', rotateRadians:expect.any(Number) }
      ]);
      expect(overrides.every(override => override.transformType === 'rotate'
        && Number.isFinite(override.rotateRadians))).toBe(true);
    });

    it('reproduces samples after repeated and reverse timeline queries', () => {
      const sample = createTalkingDipSampler();
      const first = sample(12345);
      sample(90000);
      sample(100);
      expect(sample(12345)).toEqual(first);
      expect(sample(12345)).toEqual(first);
    });

    it('loops during long speech', () => {
      const sample = createTalkingDipSampler();
      expect(Array.from({ length:600 }, (_, timeI) => sample(timeI * 100)))
        .toEqual(Array.from({ length:600 }, (_, timeI) => sample(60000 + timeI * 100)));
    });

    it('repeats phase selection from the same seed without regenerating the sequence', () => {
      const first = createTalkingDipSampler();
      setSeed(407);
      const second = createTalkingDipSampler();
      expect(Array.from({ length:600 }, (_, timeI) => first(timeI * 100)))
        .toEqual(Array.from({ length:600 }, (_, timeI) => second(timeI * 100)));
    });
  });
});