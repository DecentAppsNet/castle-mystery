import { describe, expect, it } from 'vitest';
import { createGiveEffect } from '../giveEffectUtil';
import { collectAnatomyOverrides, aggregateSpriteOverrides } from '../spriteOverrideUtil';
import { INVENTORY, LEFT_HAND, RIGHT_HAND } from '@/game/itemOwnershipUtil';
import { createDefaultItem } from '@/game/types/Item';
import { createBodyCanvasLayout, createBodyPose, createDefaultCharacterBody, createVisualBodyLayout } from '@/game/characterBody';
import CharacterAnatomyContext from '../types/CharacterAnatomyContext';
import SpriteOverride from '../types/SpriteOverride';
import characterAnatomyContext from './fixtures/characterAnatomyContext';

const CHARACTER_CONTEXT:CharacterAnatomyContext = {
  ...characterAnatomyContext,
  baseCharacterCenterById:new Map([['giver', [100, 200]], ['recipient', [800, 350]]])
};

describe('giveEffectUtil', () => {
  describe('createGiveEffect()', () => {
    it('returns progress through anatomy only and no contributions outside its interval', () => {
      const effect = createGiveEffect(createDefaultItem(), LEFT_HAND, 'recipient', 100);
      expect(effect.drawHandler).toBeNull();
      expect(effect.anatomyHandler).toEqual(expect.any(Function));
      expect(effect.endTime - effect.startTime).toBe(500);
      expect(collectAnatomyOverrides([effect], CHARACTER_CONTEXT, 100, 0)).toEqual([{
        spriteKind:'farHand', transformType:'deferredHandDisplacement', destinationCanvasPoint:[800, 350], weight:0
      }]);
      expect(collectAnatomyOverrides([effect], CHARACTER_CONTEXT, 350, 0)).toMatchObject([{ weight:0.5 }]);
      expect(collectAnatomyOverrides([effect], CHARACTER_CONTEXT, 600, 0)).toMatchObject([{ weight:1 }]);
      expect(collectAnatomyOverrides([effect], CHARACTER_CONTEXT, 99, 0)).toEqual([]);
      expect(collectAnatomyOverrides([effect], CHARACTER_CONTEXT, 601, 0)).toEqual([]);
    });

    it('maps both gameplay hands to concrete nodes in either ownership mapping', () => {
      const left = createGiveEffect(createDefaultItem(), LEFT_HAND, 'recipient', 100);
      const right = createGiveEffect(createDefaultItem(), RIGHT_HAND, 'recipient', 100);
      const reversed = { ...CHARACTER_CONTEXT, leftHandPartKind:'nearHand' as const };
      expect(collectAnatomyOverrides([left], CHARACTER_CONTEXT, 350, 0)).toMatchObject([{ spriteKind:'farHand' }]);
      expect(collectAnatomyOverrides([right], CHARACTER_CONTEXT, 350, 0)).toMatchObject([{ spriteKind:'nearHand' }]);
      expect(collectAnatomyOverrides([left], reversed, 350, 0)).toMatchObject([{ spriteKind:'nearHand' }]);
      expect(collectAnatomyOverrides([right], reversed, 350, 0)).toMatchObject([{ spriteKind:'farHand' }]);
    });

    it('uses completed base centers regardless of recipient lookup order or sampling order', () => {
      const effect = createGiveEffect(createDefaultItem(), RIGHT_HAND, 'recipient', 100);
      const before = [...CHARACTER_CONTEXT.baseCharacterCenterById];
      const recipientFirst = { ...CHARACTER_CONTEXT, baseCharacterCenterById:new Map([...before].reverse()) };
      const original = collectAnatomyOverrides([effect], CHARACTER_CONTEXT, 350, 0);
      collectAnatomyOverrides([effect], CHARACTER_CONTEXT, 550, 0);
      collectAnatomyOverrides([effect], CHARACTER_CONTEXT, 100, 0);
      expect(collectAnatomyOverrides([effect], recipientFirst, 350, 999)).toEqual(original);
      expect([...CHARACTER_CONTEXT.baseCharacterCenterById]).toEqual(before);
      const nextFrame:CharacterAnatomyContext = { ...CHARACTER_CONTEXT,
        baseCharacterCenterById:new Map([['recipient', [900, 450]]]) };
      expect(collectAnatomyOverrides([effect], nextFrame, 350, 0))
        .toMatchObject([{ destinationCanvasPoint:[900, 450] }]);
    });

    it('resolves from the animated giver hand to the recipient torso without changing base geometry', () => {
      const effect = createGiveEffect(createDefaultItem(), RIGHT_HAND, 'recipient', 100);
      const root = createDefaultCharacterBody();
      const base = createBodyCanvasLayout(createBodyPose(root, 'standing', 'right'), [137, 251], CHARACTER_CONTEXT.scalingFactors);
      const before = structuredClone(base);
      const rotation:SpriteOverride = { spriteKind:'nearArm', transformType:'rotate', rotateRadians:0.7 };
      const animated = createVisualBodyLayout(base, [rotation], 'right');
      const resolve = (time:number) => createVisualBodyLayout(base, aggregateSpriteOverrides([
        rotation, ...collectAnatomyOverrides([effect], CHARACTER_CONTEXT, time, 0)
      ], { rootBodyPart:root, facingDirection:'right' }), 'right');
      expect(resolve(100)).toEqual(animated);
      const middle = resolve(350).rightHand;
      expect(middle.x).toBeCloseTo((animated.rightHand.x + 800) / 2);
      expect(middle.y).toBeCloseTo((animated.rightHand.y + 350) / 2);
      expect(resolve(600).rightHand.x).toBeCloseTo(800);
      expect(resolve(600).rightHand.y).toBeCloseTo(350);
      expect(base).toEqual(before);
    });

    it('preserves draw-only inventory gives without anatomy displacement', () => {
      const effect = createGiveEffect(createDefaultItem(), INVENTORY, 'recipient', 100);
      expect(effect.anatomyHandler).toBeNull();
      expect(effect.drawHandler).toEqual(expect.any(Function));
      expect(collectAnatomyOverrides([effect], characterAnatomyContext, 350, 0)).toEqual([]);
      expect(effect.endTime - effect.startTime).toBe(500);
    });
  });
});