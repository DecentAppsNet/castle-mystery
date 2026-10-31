import { assertNonNullable } from 'decent-portal';
import { beforeEach, describe, expect, it } from 'vitest';

import { rand, setSeed } from '@/common/randUtil';
import { PreparedAnimationText } from '@/game/textAnimations/types/PreparedAnimationText';
import ScalingFactors from '@/game/types/ScalingFactors';
import { createEmitsEffect, createSaysEffect, createThinksEffect } from '../speechEffectUtil';
import CharacterEffectDrawContext from '../types/CharacterEffectDrawContext';
import Effect from '../types/Effect';
import EffectDrawCall from '../types/EffectDrawCall';

const TEXT:PreparedAnimationText = { plainText:'Hello.', spans:[] };
const CHARACTER_CONTEXT = { bodyOrientation:'standing' } as CharacterEffectDrawContext;
const SCALING_FACTORS = {} as ScalingFactors;
const CANVAS_CONTEXT = {} as CanvasRenderingContext2D;

function _query(effect:Effect, time:number, metaTime = 0,
    drawCall:EffectDrawCall = { stage:'beforeCharacter', characterContext:CHARACTER_CONTEXT }) {
  assertNonNullable(effect.handler);
  return effect.handler(drawCall, SCALING_FACTORS, time, metaTime, CANVAS_CONTEXT);
}

describe('speechEffectUtil', () => {
  beforeEach(() => setSeed(407));

  describe('createSaysEffect()', () => {
    it('preserves the speech interval and head override while adding concrete arms', () => {
      const effect = createSaysEffect('sam', TEXT, 100, 60000);
      expect(effect).toMatchObject({ kind:'says', startTime:100, endTime:60100 });
      const samples = Array.from({ length:600 }, (_, timeI) => _query(effect, 100 + timeI * 100));
      expect(samples.every(result => result?.spriteOverrides.filter(override => override.spriteKind === 'head').length === 1))
        .toBe(true);
      const overrides = samples.flatMap(result => result?.spriteOverrides ?? []);
      expect(new Set(overrides.map(override => override.spriteKind)))
        .toEqual(new Set(['head', 'nearArm', 'farArm']));
      expect(overrides.every(override => override.transformType === 'rotate'
        && Number.isFinite(override.rotateRadians))).toBe(true);
    });

    it('samples arms from elapsed timeline time regardless of query order and meta time', () => {
      const effect = createSaysEffect('sam', TEXT, 100, 180000);
      const first = _query(effect, 12445, 10);
      _query(effect, 90100, 20);
      _query(effect, 200, 30);
      expect(_query(effect, 12445, 10000)).toEqual(first);
      expect(_query(effect, 72445, 20000)).toEqual(first);
    });

    it('does not sample arms before speech or at its end', () => {
      const effect = createSaysEffect('sam', TEXT, 100, 1000);
      expect(_query(effect, 99)?.spriteOverrides.map(override => override.spriteKind)).toEqual(['head']);
      expect(_query(effect, 100)?.spriteOverrides.map(override => override.spriteKind)).toEqual(['head']);
      expect(_query(effect, 1100)?.spriteOverrides.map(override => override.spriteKind)).toEqual(['head']);
      expect(_query(effect, 1101)?.spriteOverrides.map(override => override.spriteKind)).toEqual(['head']);
    });

    it('performs no random draws while sampling after existing head-dip initialization', () => {
      const effect = createSaysEffect('sam', TEXT, 100, 60000);
      _query(effect, 100);
      setSeed(902);
      const expected = rand();
      setSeed(902);
      _query(effect, 500);
      _query(effect, 200);
      _query(effect, 40000);
      expect(rand()).toBe(expected);
    });

    it('uses the current posture for both arms without changing head dips or context', () => {
      const effect = createSaysEffect('sam', TEXT, 100, 60000);
      const standing:EffectDrawCall = { stage:'beforeCharacter',
        characterContext:Object.freeze({ ...CHARACTER_CONTEXT, bodyOrientation:'standing' }) };
      const laying:EffectDrawCall = { stage:'beforeCharacter',
        characterContext:Object.freeze({ ...CHARACTER_CONTEXT, bodyOrientation:'laying' }) };
      const time = Array.from({ length:600 }, (_, timeI) => 100 + timeI * 100)
        .find(candidate => _query(effect, candidate)?.spriteOverrides.length === 3);
      assertNonNullable(time);
      const uprightResult = _query(effect, time, 0, standing);
      const layingResult = _query(effect, time, 0, laying);
      assertNonNullable(uprightResult);
      assertNonNullable(layingResult);
      expect(layingResult.spriteOverrides.find(override => override.spriteKind === 'head'))
        .toEqual(uprightResult.spriteOverrides.find(override => override.spriteKind === 'head'));
      expect(layingResult.spriteOverrides.find(override => override.spriteKind === 'nearArm'))
        .not.toEqual(uprightResult.spriteOverrides.find(override => override.spriteKind === 'nearArm'));
      expect(layingResult.spriteOverrides.find(override => override.spriteKind === 'farArm'))
        .not.toEqual(uprightResult.spriteOverrides.find(override => override.spriteKind === 'farArm'));
      expect(_query(effect, time, 10000, standing)).toEqual(uprightResult);
    });

    it('keeps zero-length speech arms neutral', () => {
      const effect = createSaysEffect('sam', TEXT, 100, 0);
      expect(_query(effect, 100)?.spriteOverrides.map(override => override.spriteKind)).toEqual(['head']);
      expect(_query(effect, 101)?.spriteOverrides.map(override => override.spriteKind)).toEqual(['head']);
    });

    it('keeps very short speech finite with neutral arm endpoints', () => {
      const effect = createSaysEffect('sam', TEXT, 100, 0.001);
      expect(_query(effect, 100)?.spriteOverrides.map(override => override.spriteKind)).toEqual(['head']);
      expect(_query(effect, 100.001)?.spriteOverrides.map(override => override.spriteKind)).toEqual(['head']);
      expect(_query(effect, 100.0005)?.spriteOverrides.every(override => override.transformType === 'rotate'
        && Number.isFinite(override.rotateRadians))).toBe(true);
    });

    it('does not return arm overrides at other drawing stages', () => {
      const effect = createSaysEffect('sam', TEXT, 100, 60000);
      expect(_query(effect, 500, 0, { stage:'afterCharacter', characterContext:CHARACTER_CONTEXT })).toBeNull();
      expect(_query(effect, 500, 0, {
        stage:'characterAfterLevel',
        characterContext:{ ...CHARACTER_CONTEXT, characterAnatomy:{
          anchorX:0, anchorTopY:0
        } as CharacterEffectDrawContext['characterAnatomy'], isCharacterInActiveRoom:false, isLevelComplete:false }
      })).toBeNull();
    });
  });

  describe('other speech factories', () => {
    it('keeps thoughts restricted to the existing head override', () => {
      const effect = createThinksEffect(TEXT, 100, 60000, 'right');
      expect(_query(effect, 500)?.spriteOverrides.map(override => override.spriteKind)).toEqual(['head']);
    });

    it('does not give character emissions arm or head overrides', () => {
      const effect = createEmitsEffect({ kind:'character', characterId:'sam' }, TEXT, 100, 60000, false);
      expect(_query(effect, 500)).toBeNull();
    });
  });
});