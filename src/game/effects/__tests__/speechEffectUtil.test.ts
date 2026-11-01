import { beforeEach, describe, expect, it } from 'vitest';

import { rand, setSeed } from '@/common/randUtil';
import { PreparedAnimationText } from '@/game/textAnimations/types/PreparedAnimationText';
import ScalingFactors from '@/game/types/ScalingFactors';
import { createEmitsEffect, createSaysEffect, createThinksEffect } from '../speechEffectUtil';
import CharacterEffectDrawContext from '../types/CharacterEffectDrawContext';
import CharacterAnatomyContext from '../types/CharacterAnatomyContext';
import Effect from '../types/Effect';
import EffectDrawCall from '../types/EffectDrawCall';
import characterAnatomyContext from './fixtures/characterAnatomyContext';
import { createRoomContentDisplayLayout } from '@/game/roomContentDisplayPositionUtil';
import { createDefaultRoom } from '@/game/types/Room';

const TEXT:PreparedAnimationText = { plainText:'Hello.', spans:[] };
const CHARACTER_CONTEXT:CharacterAnatomyContext = { ...characterAnatomyContext };
const DRAW_CHARACTER_CONTEXT:CharacterEffectDrawContext = {
  bodyOrientation:'standing', isNearArmHoldingItem:false, isFarArmHoldingItem:false,
  characterAnatomy:{ anchorX:0, anchorTopY:0, characterCenterCanvasPoint:[0, 0],
    headCenterCanvasPoint:[0, 0], headRadius:1, leftHandItemCanvasPoint:[0, 0], rightHandItemCanvasPoint:[0, 0] },
  characterAnatomyById:new Map(), imageSet:new Map(),
  isActiveCharacter:false, isCharacterInActiveRoom:false, isLevelComplete:false,
  roomContentDisplayLayout:createRoomContentDisplayLayout(createDefaultRoom(), [])
};
const SCALING_FACTORS = {} as ScalingFactors;
const CANVAS_CONTEXT = {} as CanvasRenderingContext2D;

function _query(effect:Effect, time:number, metaTime = 0,
    context:CharacterAnatomyContext = CHARACTER_CONTEXT) {
  expect(effect.anatomyHandler).toEqual(expect.any(Function));
  return effect.anatomyHandler!(context, time, metaTime);
}

function _draw(effect:Effect, drawCall:EffectDrawCall) {
  expect(effect.drawHandler).toEqual(expect.any(Function));
  return effect.drawHandler!(drawCall, SCALING_FACTORS, 500, 0, CANVAS_CONTEXT);
}

describe('speechEffectUtil', () => {
  beforeEach(() => setSeed(407));

  describe('createSaysEffect()', () => {
    it('preserves the speech interval and head override while adding concrete arms', () => {
      const effect = createSaysEffect('sam', TEXT, 100, 60000);
      expect(effect).toMatchObject({ kind:'says', startTime:100, endTime:60100 });
      const samples = Array.from({ length:600 }, (_, timeI) => _query(effect, 100 + timeI * 100));
      expect(samples.every(result => result.filter(override => override.spriteKind === 'head').length === 1))
        .toBe(true);
      const overrides = samples.flat();
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

    it('returns no anatomy outside speech and begins with neutral arms', () => {
      const effect = createSaysEffect('sam', TEXT, 100, 1000);
      expect(_query(effect, -100000)).toEqual([]);
      expect(_query(effect, 99)).toEqual([]);
      expect(_query(effect, 100).map(override => override.spriteKind)).toEqual(['head']);
      expect(_query(effect, 1100)).toEqual([]);
      expect(_query(effect, 1101)).toEqual([]);
    });

    it('performs no random draws while sampling anatomy', () => {
      const effect = createSaysEffect('sam', TEXT, 100, 60000);
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
      const standing:CharacterAnatomyContext = Object.freeze({ ...CHARACTER_CONTEXT, bodyOrientation:'standing' });
      const laying:CharacterAnatomyContext = Object.freeze({ ...CHARACTER_CONTEXT, bodyOrientation:'laying' });
      const times = Array.from({ length:600 }, (_, timeI) => 100 + timeI * 100);
      const upright = times.map(time => _query(effect, time, 0, standing));
      const prone = times.map(time => _query(effect, time, 0, laying));
      expect(prone.map(result => result.find(override => override.spriteKind === 'head')))
        .toEqual(upright.map(result => result.find(override => override.spriteKind === 'head')));
      const nearTimeI = upright.findIndex(result => result.some(override => override.spriteKind === 'nearArm'));
      const farTimeI = upright.findIndex(result => result.some(override => override.spriteKind === 'farArm'));
      expect(nearTimeI).toBeGreaterThanOrEqual(0);
      expect(farTimeI).toBeGreaterThanOrEqual(0);
      expect(prone[nearTimeI].find(override => override.spriteKind === 'nearArm'))
        .not.toEqual(upright[nearTimeI].find(override => override.spriteKind === 'nearArm'));
      expect(prone[farTimeI].find(override => override.spriteKind === 'farArm'))
        .not.toEqual(upright[farTimeI].find(override => override.spriteKind === 'farArm'));
      expect(times.map(time => _query(effect, time, 10000, standing))).toEqual(upright);
    });

    it('returns no anatomy for zero-length speech', () => {
      const effect = createSaysEffect('sam', TEXT, 100, 0);
      expect(_query(effect, 100)).toEqual([]);
      expect(_query(effect, 101)).toEqual([]);
    });

    it('keeps very short speech finite with neutral arm endpoints', () => {
      const effect = createSaysEffect('sam', TEXT, 100, 0.001);
      expect(_query(effect, 100).map(override => override.spriteKind)).toEqual(['head']);
      expect(_query(effect, 100.001)).toEqual([]);
      expect(_query(effect, 100.0005).every(override => override.transformType === 'rotate'
        && Number.isFinite(override.rotateRadians))).toBe(true);
    });

    it('does not return anatomy through drawing stages', () => {
      const effect = createSaysEffect('sam', TEXT, 100, 60000);
      const characterContext = DRAW_CHARACTER_CONTEXT;
      expect(_draw(effect, { stage:'beforeCharacter', characterContext })).toBeNull();
      expect(_draw(effect, { stage:'afterCharacter', characterContext })).toBeNull();
      expect(_draw(effect, {
        stage:'characterAfterLevel',
        characterContext
      })).toBeNull();
    });
  });

  describe('current held-item context', () => {
    it('suppresses only the near arm without changing head or free-arm samples', () => {
      const effect = createSaysEffect('sam', TEXT, 100, 60000);
      const original = Array.from({ length:600 }, (_, timeI) => _query(effect, 100 + timeI * 100));
      expect(original.some(result => result.some(override => override.spriteKind === 'nearArm')))
        .toBe(true);
      const context = Object.freeze({ ...CHARACTER_CONTEXT, isNearArmHoldingItem:true });
      expect(Array.from({ length:600 }, (_, timeI) => _query(effect, 100 + timeI * 100, 0, context)))
        .toEqual(original.map(result => result.filter(override => override.spriteKind !== 'nearArm')));
    });

    it('suppresses only the far arm without changing head or free-arm samples', () => {
      const effect = createSaysEffect('sam', TEXT, 100, 60000);
      const original = Array.from({ length:600 }, (_, timeI) => _query(effect, 100 + timeI * 100));
      expect(original.some(result => result.some(override => override.spriteKind === 'farArm')))
        .toBe(true);
      const context = Object.freeze({ ...CHARACTER_CONTEXT, isFarArmHoldingItem:true });
      expect(Array.from({ length:600 }, (_, timeI) => _query(effect, 100 + timeI * 100, 0, context)))
        .toEqual(original.map(result => result.filter(override => override.spriteKind !== 'farArm')));
    });

    it('suppresses both arms and retains deterministic head dips', () => {
      const effect = createSaysEffect('sam', TEXT, 100, 60000);
      const original = _query(effect, 12345);
      const context = Object.freeze({ ...CHARACTER_CONTEXT, isNearArmHoldingItem:true, isFarArmHoldingItem:true });
      expect(_query(effect, 12345, 0, context)).toEqual(original.filter(override => override.spriteKind === 'head'));
      _query(effect, 50000);
      _query(effect, 1000);
      expect(_query(effect, 12345, 9999, context)).toEqual(original.filter(override => override.spriteKind === 'head'));
    });

    it('resumes free-arm samples when current occupancy clears without replacing the handler', () => {
      const effect = createSaysEffect('sam', TEXT, 100, 60000);
      const handler = effect.drawHandler;
      const anatomyHandler = effect.anatomyHandler;
      const time = Array.from({ length:600 }, (_, timeI) => 100 + timeI * 100)
        .find(candidate => _query(effect, candidate).some(override => override.spriteKind !== 'head'));
      expect(time).toBeDefined();
      const original = _query(effect, time!);
      const context = { ...CHARACTER_CONTEXT, isNearArmHoldingItem:true, isFarArmHoldingItem:true };
      expect(_query(effect, time!, 0, context).map(override => override.spriteKind)).toEqual(['head']);
      expect(_query(effect, time!)).toEqual(original);
      expect(effect.drawHandler).toBe(handler);
      expect(effect.anatomyHandler).toBe(anatomyHandler);
    });
  });

  describe('other speech factories', () => {
    it('keeps thoughts restricted to the existing head override', () => {
      const effect = createThinksEffect(TEXT, 100, 60000, 'right');
      expect(_query(effect, 500).map(override => override.spriteKind)).toEqual(['head']);
      expect(_draw(effect, { stage:'beforeCharacter', characterContext:DRAW_CHARACTER_CONTEXT })).toBeNull();
    });

    it('returns no thought anatomy outside its interval or for zero duration', () => {
      const effect = createThinksEffect(TEXT, 100, 1000, 'left');
      expect(_query(effect, 99)).toEqual([]);
      expect(_query(effect, 100).map(override => override.spriteKind)).toEqual(['head']);
      expect(_query(effect, 1100)).toEqual([]);
      expect(_query(effect, 1101)).toEqual([]);
      expect(_query(createThinksEffect(TEXT, 100, 0, 'right'), 100)).toEqual([]);
    });

    it('samples short thoughts independently of query order, meta time, and held-arm context', () => {
      const effect = createThinksEffect(TEXT, 100, 50, 'left');
      const original = _query(effect, 125);
      expect(original).toHaveLength(1);
      expect(original.every(override => override.transformType === 'rotate'
        && Number.isFinite(override.rotateRadians))).toBe(true);
      _query(effect, 149);
      _query(effect, 100);
      const context = Object.freeze({ ...CHARACTER_CONTEXT, isNearArmHoldingItem:true, isFarArmHoldingItem:true });
      expect(_query(effect, 125, 9999, context)).toEqual(original);
    });

    it('does not give character emissions arm or head overrides', () => {
      const effect = createEmitsEffect({ kind:'character', characterId:'sam' }, TEXT, 100, 60000, false);
      expect(effect.anatomyHandler).toBeNull();
      expect(effect.drawHandler).toEqual(expect.any(Function));
    });
  });
});