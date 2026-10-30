import { describe, expect, it } from 'vitest';
import { assertNonNullable } from 'decent-portal';

import ScalingFactors from '@/game/types/ScalingFactors';
import CharacterEffectDrawContext from '../types/CharacterEffectDrawContext';
import LevelEffectDrawContext from '../types/LevelEffectDrawContext';
import Effect from '../types/Effect';
import EffectDrawCall from '../types/EffectDrawCall';
import { createPointEffect, getPointTiming } from '../pointEffectUtil';

const CHARACTER_CONTEXT = {} as CharacterEffectDrawContext;
const SCALING_FACTORS = {} as ScalingFactors;
const CANVAS_CONTEXT = {} as CanvasRenderingContext2D;

function _query(effect:Effect, time:number, metaTime = 0,
    drawCall:EffectDrawCall = { stage:'beforeCharacter', characterContext:CHARACTER_CONTEXT }) {
  assertNonNullable(effect.handler);
  return effect.handler(drawCall, SCALING_FACTORS, time, metaTime, CANVAS_CONTEXT);
}

function _rotation(effect:Effect, time:number):number {
  const result = _query(effect, time);
  assertNonNullable(result);
  const override = result.spriteOverrides[0];
  assertNonNullable(override);
  if (override.transformType !== 'rotate') throw new Error('Expected rotation override.');
  return override.rotateRadians;
}

describe('pointEffectUtil', () => {
  describe('createPointEffect()', () => {
    it('uses the complete default timing profile', () => {
      const timing = getPointTiming();
      const effect = createPointEffect(100, 1);

      expect(effect.kind).toBe('point');
      expect(effect.endTime - effect.startTime).toBe(timing.duration);
      expect(timing.duration).toBe(timing.pointing + timing.pointed + timing.resting);
    });

    it('uses the complete quick timing profile', () => {
      const timing = getPointTiming('quickly');
      const effect = createPointEffect(100, 1, 'quickly');

      expect(effect.endTime - effect.startTime).toBe(timing.duration);
      expect(timing.duration).toBe(timing.pointing + timing.pointed + timing.resting);
    });

    it('uses the complete slow timing profile', () => {
      const timing = getPointTiming('slowly');
      const effect = createPointEffect(100, 1, 'slowly');

      expect(effect.endTime - effect.startTime).toBe(timing.duration);
      expect(timing.duration).toBe(timing.pointing + timing.pointed + timing.resting);
    });

    it('emits only a relative near-arm rotation', () => {
      const effect = createPointEffect(100, 1);

      expect(_query(effect, 100 + getPointTiming().pointing)).toEqual({ spriteOverrides:[
        { spriteKind:'nearArm', transformType:'rotate', rotateRadians:1 }
      ] });
    });

    it('advances to the captured angle, holds it, and returns toward rest', () => {
      const effect = createPointEffect(100, 1);
      const { pointing, pointed, resting } = getPointTiming();

      expect(_rotation(effect, effect.startTime)).toBe(0);
      expect(_rotation(effect, effect.startTime + pointing / 2)).toBeGreaterThan(0);
      expect(_rotation(effect, effect.startTime + pointing / 2)).toBeLessThan(1);
      expect(_rotation(effect, effect.startTime + pointing)).toBe(1);
      expect(_rotation(effect, effect.startTime + pointing + pointed / 2)).toBe(1);
      expect(_rotation(effect, effect.startTime + pointing + pointed)).toBe(1);
      expect(_rotation(effect, effect.endTime - resting / 2)).toBeGreaterThan(0);
      expect(_rotation(effect, effect.endTime - resting / 2)).toBeLessThan(1);
      expect(_rotation(effect, effect.endTime)).toBe(0);
    });

    it('leaves the resolved pose unchanged outside its interval', () => {
      const effect = createPointEffect(100, -1);

      expect(_rotation(effect, effect.startTime - 1)).toBe(0);
      expect(_rotation(effect, effect.endTime + 1)).toBe(0);
    });

    it('preserves the sign of a negative relative angle', () => {
      const effect = createPointEffect(100, -1);
      const { pointing } = getPointTiming();

      expect(_rotation(effect, effect.startTime + pointing / 2)).toBeLessThan(0);
      expect(_rotation(effect, effect.startTime + pointing)).toBe(-1);
      expect(_rotation(effect, effect.endTime)).toBe(0);
    });

    it('returns no result at unrelated drawing stages', () => {
      const effect = createPointEffect(100, 1);

      expect(_query(effect, 100, 0, { stage:'afterCharacter', characterContext:CHARACTER_CONTEXT })).toBeNull();
      expect(_query(effect, 100, 0, { stage:'characterAfterLevel', characterContext:CHARACTER_CONTEXT })).toBeNull();
      expect(_query(effect, 100, 0, { stage:'afterLevel', levelContext:{} as LevelEffectDrawContext })).toBeNull();
    });

    it('reproduces results after reverse and repeated queries regardless of meta time', () => {
      const effect = createPointEffect(100, 1);
      const { pointing, resting } = getPointTiming();
      const sampleTime = effect.startTime + pointing / 3;
      const first = _query(effect, sampleTime, 10);

      _query(effect, effect.endTime - resting / 2, 20);
      _query(effect, effect.endTime, 30);
      _query(effect, effect.startTime, 40);
      expect(_query(effect, sampleTime, 10000)).toEqual(first);
      expect(_query(effect, sampleTime, 10000)).toEqual(first);
      expect(_query(createPointEffect(100, 1), sampleTime)).toEqual(first);
    });
  });
});