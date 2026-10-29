import { describe, expect, it } from 'vitest';
import { assertNonNullable } from 'decent-portal';

import ScalingFactors from '@/game/types/ScalingFactors';
import CharacterEffectDrawContext from '../types/CharacterEffectDrawContext';
import LevelEffectDrawContext from '../types/LevelEffectDrawContext';
import Effect from '../types/Effect';
import EffectDrawCall from '../types/EffectDrawCall';
import { createWalkEffect } from '../walkEffectUtil';

const CHARACTER_CONTEXT = {} as CharacterEffectDrawContext;
const SCALING_FACTORS = {} as ScalingFactors;
const CANVAS_CONTEXT = {} as CanvasRenderingContext2D;

function _query(effect:Effect, time:number, metaTime = 0,
    drawCall:EffectDrawCall = { stage:'beforeCharacter', characterContext:CHARACTER_CONTEXT }) {
  assertNonNullable(effect.handler);
  return effect.handler(drawCall, SCALING_FACTORS, time, metaTime, CANVAS_CONTEXT);
}

describe('walkEffectUtil', () => {
  describe('createWalkEffect()', () => {
    it('creates a walk effect with the supplied timeline interval', () => {
      const effect = createWalkEffect(100, 1100);
      expect(effect).toMatchObject({ kind:'walk', startTime:100, endTime:1100 });
      expect(effect.handler).toEqual(expect.any(Function));
    });

    it('returns only supported leg translations and arm rotations', () => {
      const result = _query(createWalkEffect(100, 1100), 400);
      expect(result?.spriteOverrides).toEqual([
        { spriteKind:'leftLeg', transformType:'translatePartHeight', translateHeightRatio:expect.any(Number) },
        { spriteKind:'rightLeg', transformType:'translatePartHeight', translateHeightRatio:expect.any(Number) },
        { spriteKind:'nearArm', transformType:'rotate', rotateRadians:expect.any(Number) },
        { spriteKind:'farArm', transformType:'rotate', rotateRadians:expect.any(Number) }
      ]);
    });

    it('returns no result at unrelated drawing stages', () => {
      const effect = createWalkEffect(100, 1100);
      expect(_query(effect, 400, 0, { stage:'afterCharacter', characterContext:CHARACTER_CONTEXT })).toBeNull();
      expect(_query(effect, 400, 0, { stage:'characterAfterLevel', characterContext:CHARACTER_CONTEXT })).toBeNull();
      expect(_query(effect, 400, 0, { stage:'afterLevel', levelContext:{} as LevelEffectDrawContext })).toBeNull();
    });

    it('leaves the resolved pose unchanged at both endpoints and outside the interval', () => {
      const effect = createWalkEffect(100, 1100);
      const neutral = { spriteOverrides:[
        { spriteKind:'leftLeg', transformType:'translatePartHeight', translateHeightRatio:0 },
        { spriteKind:'rightLeg', transformType:'translatePartHeight', translateHeightRatio:0 },
        { spriteKind:'nearArm', transformType:'rotate', rotateRadians:0 },
        { spriteKind:'farArm', transformType:'rotate', rotateRadians:0 }
      ] };
      expect(_query(effect, 0)).toEqual(neutral);
      expect(_query(effect, 100)).toEqual(neutral);
      expect(_query(effect, 1100)).toEqual(neutral);
      expect(_query(effect, 1200)).toEqual(neutral);
    });

    it('preserves endpoint neutrality for short travel intervals', () => {
      const effect = createWalkEffect(100, 101);
      expect(_query(effect, 100)).toEqual(_query(effect, 101));
      expect(_query(effect, 100.5)?.spriteOverrides.map(override => override.spriteKind))
        .toEqual(['leftLeg', 'rightLeg', 'nearArm', 'farArm']);
    });

    it('reproduces poses after out-of-order queries regardless of meta time', () => {
      const effect = createWalkEffect(100, 1100);
      const first = _query(effect, 420, 10);
      _query(effect, 900, 20);
      _query(effect, 200, 30);
      expect(_query(effect, 420, 10000)).toEqual(first);
      expect(_query(createWalkEffect(100, 1100), 420)).toEqual(first);
    });
  });
});