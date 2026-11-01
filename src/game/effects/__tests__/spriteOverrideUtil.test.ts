import { describe, expect, it } from 'vitest';
import { createDefaultCharacter } from '@/game/types/Character';
import { aggregateSpriteOverrides, collectAnatomyOverrides } from '../spriteOverrideUtil';
import SpriteOverride from '../types/SpriteOverride';
import CharacterAnatomyContext from '../types/CharacterAnatomyContext';
import Effect from '../types/Effect';
import { createWalkEffect } from '../walkEffectUtil';

describe('spriteOverrideUtil', () => {
  describe('collectAnatomyOverrides()', () => {
    it('calls each anatomy capability once with the same readonly context and clocks, never invoking drawing', () => {
      const context:CharacterAnatomyContext = Object.freeze({
        bodyOrientation:'standing', isNearArmHoldingItem:false, isFarArmHoldingItem:true
      });
      const calls:unknown[] = [];
      const contribution:SpriteOverride = { spriteKind:'head', transformType:'rotate', rotateRadians:0.2 };
      const effect:Effect = { kind:'says', startTime:0, endTime:1000,
        drawHandler:() => { throw new Error('Draw handler must not run during anatomy collection.'); },
        anatomyHandler:(received, gameTime, metaTime) => {
          calls.push([received, gameTime, metaTime]);
          return [contribution];
        }
      };
      const effects = [effect, { ...effect, anatomyHandler:null }, { ...effect, drawHandler:null }];
      const result = collectAnatomyOverrides(effects, context, 123, 456);
      expect(result).toEqual([contribution, contribution]);
      expect(calls).toEqual([[context, 123, 456], [context, 123, 456]]);
      expect(effect.anatomyHandler).toEqual(expect.any(Function));
    });

    it('returns an empty array for no effects or inactive anatomy', () => {
      const context:CharacterAnatomyContext = {
        bodyOrientation:'standing', isNearArmHoldingItem:false, isFarArmHoldingItem:false
      };
      expect(collectAnatomyOverrides([], context, 0, 0)).toEqual([]);
      expect(collectAnatomyOverrides([createWalkEffect(100, 1100)], context, 99, 0)).toEqual([]);
    });

    it('collects a walking contribution once before aggregation and preserves legacy contributions', () => {
      const character = createDefaultCharacter();
      const context:CharacterAnatomyContext = {
        bodyOrientation:'standing', isNearArmHoldingItem:false, isFarArmHoldingItem:false
      };
      const effect = createWalkEffect(100, 1100);
      const collected = collectAnatomyOverrides([effect], context, 400, 0);
      expect(collected).toHaveLength(4);
      expect(effect.drawHandler).toBeNull();
      const legacy:SpriteOverride = { spriteKind:'head', transformType:'rotate', rotateRadians:0.2 };
      const result = aggregateSpriteOverrides([...collected, legacy], character);
      expect(result).toHaveLength(5);
      for (const contribution of [...collected, legacy]) expect(result).toContainEqual(contribution);
    });
  });

  describe('aggregateSpriteOverrides()', () => {
    it('returns no contributions for empty input', () => {
      expect(aggregateSpriteOverrides([], createDefaultCharacter())).toEqual([]);
    });

    it('adds matching deltas without merging different targets or coordinate frames', () => {
      const overrides:SpriteOverride[] = [
        { spriteKind:'head', transformType:'rotate', rotateRadians:0.2 },
        { spriteKind:'head', transformType:'rotate', rotateRadians:0.3 },
        { spriteKind:'leftLeg', transformType:'translatePartHeight', translateHeightRatio:0.1 },
        { spriteKind:'leftLeg', transformType:'translatePartHeight', translateHeightRatio:-0.4 },
        { spriteKind:'rightLeg', transformType:'translatePartHeight', translateHeightRatio:0.6 },
        { spriteKind:'leftHandItem', transformType:'translateCanvas', translateCanvasX:12, translateCanvasY:-8 },
        { spriteKind:'leftHandItem', transformType:'translateCanvas', translateCanvasX:-3, translateCanvasY:2 },
        { spriteKind:'rightHandItem', transformType:'translateCanvas', translateCanvasX:7, translateCanvasY:4 }
      ];
      const result = aggregateSpriteOverrides(overrides, createDefaultCharacter());
      expect(result).toHaveLength(5);
      expect(result).toContainEqual({ spriteKind:'head', transformType:'rotate', rotateRadians:0.5 });
      expect(result).toContainEqual({ spriteKind:'leftLeg', transformType:'translatePartHeight',
        translateHeightRatio:expect.closeTo(-0.3) });
      expect(result).toContainEqual(overrides[4]);
      expect(result).toContainEqual({ spriteKind:'leftHandItem', transformType:'translateCanvas',
        translateCanvasX:9, translateCanvasY:-6 });
      expect(result).toContainEqual(overrides[7]);
    });

    it('resolves viewer aliases before combining with concrete vector arm targets in both facings', () => {
      for (const facingDirection of ['right', 'left'] as const) {
        const character = { ...createDefaultCharacter(), facingDirection };
        const front = facingDirection === 'right' ? 'nearArm' : 'farArm';
        const back = facingDirection === 'right' ? 'farArm' : 'nearArm';
        const result = aggregateSpriteOverrides([
          { spriteKind:'viewerFrontArm', transformType:'rotate', rotateRadians:0.2 },
          { spriteKind:front, transformType:'rotate', rotateRadians:0.3 },
          { spriteKind:'viewerBackArm', transformType:'rotate', rotateRadians:-0.1 },
          { spriteKind:back, transformType:'rotate', rotateRadians:0.4 }
        ], character);
        expect(result).toHaveLength(2);
        expect(result).toContainEqual({ spriteKind:front, transformType:'rotate', rotateRadians:0.5 });
        expect(result).toContainEqual({ spriteKind:back, transformType:'rotate', rotateRadians:expect.closeTo(0.3) });
      }
    });

    it('preserves fixed raster depth roles in both facings', () => {
      const base = createDefaultCharacter();
      for (const facingDirection of ['right', 'left'] as const) {
        const character = { ...base, facingDirection,
          rootBodyPart:{ ...base.rootBodyPart, kind:'torso' as const, imageUrl:'/assets/bodies/torso.png' } };
        expect(aggregateSpriteOverrides([
          { spriteKind:'viewerFrontArm', transformType:'rotate', rotateRadians:0.2 },
          { spriteKind:'nearArm', transformType:'rotate', rotateRadians:0.3 }
        ], character)).toEqual([{ spriteKind:'nearArm', transformType:'rotate', rotateRadians:0.5 }]);
      }
    });

    it('cancels opposite contributions to zero and leaves inputs unchanged', () => {
      const character = createDefaultCharacter();
      const overrides:SpriteOverride[] = [
        { spriteKind:'head', transformType:'rotate', rotateRadians:0.5 },
        { spriteKind:'head', transformType:'rotate', rotateRadians:-0.5 },
        { spriteKind:'leftLeg', transformType:'translatePartHeight', translateHeightRatio:0.5 },
        { spriteKind:'leftLeg', transformType:'translatePartHeight', translateHeightRatio:-0.5 },
        { spriteKind:'leftHandItem', transformType:'translateCanvas', translateCanvasX:2, translateCanvasY:3 },
        { spriteKind:'leftHandItem', transformType:'translateCanvas', translateCanvasX:-2, translateCanvasY:-3 }
      ];
      const before = structuredClone({ overrides, character });
      const result = aggregateSpriteOverrides(overrides, character);
      expect(result).toEqual([
        { spriteKind:'head', transformType:'rotate', rotateRadians:0 },
        { spriteKind:'leftHandItem', transformType:'translateCanvas', translateCanvasX:0, translateCanvasY:0 },
        { spriteKind:'leftLeg', transformType:'translatePartHeight', translateHeightRatio:0 }
      ]);
      expect({ overrides, character }).toEqual(before);
      for (const entry of result) expect(overrides).not.toContain(entry);
    });

    it('produces equivalent totals for every permutation of overlapping contributions', () => {
      const contributions:SpriteOverride[][] = [
        [
          { spriteKind:'viewerFrontArm', transformType:'rotate', rotateRadians:0.1 },
          { spriteKind:'head', transformType:'rotate', rotateRadians:0.1 },
          { spriteKind:'leftLeg', transformType:'translatePartHeight', translateHeightRatio:0.1 },
          { spriteKind:'leftHandItem', transformType:'translateCanvas', translateCanvasX:0.1, translateCanvasY:-0.1 }
        ],
        [
          { spriteKind:'nearArm', transformType:'rotate', rotateRadians:0.2 },
          { spriteKind:'head', transformType:'rotate', rotateRadians:0.2 },
          { spriteKind:'leftLeg', transformType:'translatePartHeight', translateHeightRatio:0.2 },
          { spriteKind:'leftHandItem', transformType:'translateCanvas', translateCanvasX:0.2, translateCanvasY:-0.2 }
        ],
        [
          { spriteKind:'viewerFrontArm', transformType:'rotate', rotateRadians:0.3 },
          { spriteKind:'head', transformType:'rotate', rotateRadians:0.3 },
          { spriteKind:'leftLeg', transformType:'translatePartHeight', translateHeightRatio:0.3 },
          { spriteKind:'leftHandItem', transformType:'translateCanvas', translateCanvasX:0.3, translateCanvasY:-0.3 }
        ]
      ];
      for (const order of [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]]) {
        const result = aggregateSpriteOverrides(order.flatMap(index => contributions[index]), createDefaultCharacter());
        expect(result).toEqual([
          { spriteKind:'head', transformType:'rotate', rotateRadians:expect.closeTo(0.6) },
          { spriteKind:'leftHandItem', transformType:'translateCanvas',
            translateCanvasX:expect.closeTo(0.6), translateCanvasY:expect.closeTo(-0.6) },
          { spriteKind:'leftLeg', transformType:'translatePartHeight', translateHeightRatio:expect.closeTo(0.6) },
          { spriteKind:'nearArm', transformType:'rotate', rotateRadians:expect.closeTo(0.6) }
        ]);
      }
    });
  });
});