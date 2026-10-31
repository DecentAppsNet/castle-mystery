import { beforeEach, describe, expect, it } from 'vitest';

import { setSeed } from '@/common/randUtil';
import { createTalkingGestureSampler } from '../talkingGestureUtil';

describe('talkingGestureUtil', () => {
  beforeEach(() => setSeed(407));

  describe('createTalkingGestureSampler()', () => {
    it('is neutral before speech and at or after its end', () => {
      const sample = createTalkingGestureSampler(1000);
      expect(sample(-1)).toEqual([]);
      expect(sample(1000)).toEqual([]);
      expect(sample(1001)).toEqual([]);
    });

    it('keeps zero-length speech neutral', () => {
      const sample = createTalkingGestureSampler(0);
      expect(sample(-1)).toEqual([]);
      expect(sample(0)).toEqual([]);
      expect(sample(1)).toEqual([]);
    });

    it('reproduces samples after repeated and reverse timeline queries', () => {
      const sample = createTalkingGestureSampler(180000);
      const first = sample(12345);
      sample(90000);
      sample(100);
      expect(sample(12345)).toEqual(first);
      expect(sample(12345)).toEqual(first);
    });

    it('loops the shared sequence throughout long speech', () => {
      const sample = createTalkingGestureSampler(180000);
      const firstLoop = Array.from({ length:600 }, (_, timeI) => sample(timeI * 100));
      const secondLoop = Array.from({ length:600 }, (_, timeI) => sample(60000 + timeI * 100));
      expect(secondLoop).toEqual(firstLoop);
    });

    it('samples both concrete arms with finite rotations and omits settled rest', () => {
      const sample = createTalkingGestureSampler(60000);
      const samples = Array.from({ length:60000 }, (_, elapsed) => sample(elapsed));
      const overrides = samples.flat();
      expect(new Set(overrides.map(override => override.spriteKind))).toEqual(new Set(['nearArm', 'farArm']));
      expect(overrides.every(override => override.transformType === 'rotate'
        && Number.isFinite(override.rotateRadians) && override.rotateRadians !== 0)).toBe(true);
      expect(samples.some(overridesAtTime => overridesAtTime.length < 2)).toBe(true);
    });

    it('repeats phase selection from a seed after singleton initialization', () => {
      createTalkingGestureSampler(1000);
      setSeed(839);
      const first = createTalkingGestureSampler(60000);
      setSeed(839);
      const second = createTalkingGestureSampler(60000);
      expect(Array.from({ length:600 }, (_, timeI) => first(timeI * 100)))
        .toEqual(Array.from({ length:600 }, (_, timeI) => second(timeI * 100)));
    });
  });
});