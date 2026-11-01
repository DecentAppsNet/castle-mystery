import { describe, expect, it } from 'vitest';
import CharacterAnatomyContext from '../types/CharacterAnatomyContext';
import Effect from '../types/Effect';
import { createWalkEffect } from '../walkEffectUtil';
import characterAnatomyContext from './fixtures/characterAnatomyContext';

const CHARACTER_CONTEXT:CharacterAnatomyContext = {
  ...characterAnatomyContext
};

function _query(effect:Effect, time:number, metaTime = 0) {
  expect(effect.anatomyHandler).toEqual(expect.any(Function));
  return effect.anatomyHandler!(CHARACTER_CONTEXT, time, metaTime);
}

describe('walkEffectUtil', () => {
  describe('createWalkEffect()', () => {
    it('creates a walk effect with the supplied timeline interval', () => {
      const effect = createWalkEffect(100, 1100);
      expect(effect).toMatchObject({ kind:'walk', startTime:100, endTime:1100 });
      expect(effect.anatomyHandler).toEqual(expect.any(Function));
      expect(effect.drawHandler).toBeNull();
    });

    it('returns only supported leg translations and arm rotations', () => {
      const result = _query(createWalkEffect(100, 1100), 400);
      expect(result).toEqual([
        { spriteKind:'leftLeg', transformType:'translatePartHeight', translateHeightRatio:expect.any(Number) },
        { spriteKind:'rightLeg', transformType:'translatePartHeight', translateHeightRatio:expect.any(Number) },
        { spriteKind:'nearArm', transformType:'rotate', rotateRadians:expect.any(Number) },
        { spriteKind:'farArm', transformType:'rotate', rotateRadians:expect.any(Number) }
      ]);
    });

    it('does not expose a drawing handler', () => {
      const effect = createWalkEffect(100, 1100);
      expect(effect.drawHandler).toBeNull();
    });

    it('leaves the resolved pose unchanged at both endpoints and outside the interval', () => {
      const effect = createWalkEffect(100, 1100);
      const neutral = [
        { spriteKind:'leftLeg', transformType:'translatePartHeight', translateHeightRatio:0 },
        { spriteKind:'rightLeg', transformType:'translatePartHeight', translateHeightRatio:0 },
        { spriteKind:'nearArm', transformType:'rotate', rotateRadians:0 },
        { spriteKind:'farArm', transformType:'rotate', rotateRadians:0 }
      ];
      expect(_query(effect, 0)).toEqual([]);
      expect(_query(effect, 100)).toEqual(neutral);
      expect(_query(effect, 1100)).toEqual(neutral);
      expect(_query(effect, 1200)).toEqual([]);
    });

    it('preserves endpoint neutrality for short travel intervals', () => {
      const effect = createWalkEffect(100, 101);
      expect(_query(effect, 100)).toEqual(_query(effect, 101));
      expect(_query(effect, 100.5).map(override => override.spriteKind))
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