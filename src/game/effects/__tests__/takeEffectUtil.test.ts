import { describe, expect, it } from 'vitest';
import { createTakeEffect } from '../takeEffectUtil';
import { collectAnatomyOverrides, aggregateSpriteOverrides } from '../spriteOverrideUtil';
import { INVENTORY, LEFT_HAND, RIGHT_HAND } from '@/game/itemOwnershipUtil';
import { createDefaultItem } from '@/game/types/Item';
import { createDefaultRoom } from '@/game/types/Room';
import { createRoomContentDisplayLayout } from '@/game/roomContentDisplayPositionUtil';
import { getItemCanvasPositionInRoom } from '@/game/drawing/itemDrawUtil';
import { createBodyCanvasLayout, createBodyPose, createDefaultCharacterBody, createVisualBodyLayout } from '@/game/characterBody';
import SpriteOverride from '../types/SpriteOverride';
import characterAnatomyContext from './fixtures/characterAnatomyContext';

describe('takeEffectUtil', () => {
  describe('createTakeEffect()', () => {
    it('returns inverse progress through anatomy only, with inactive samples outside the interval', () => {
      const effect = createTakeEffect(createDefaultItem(), LEFT_HAND, { x:5, y:10, z:0 }, 0, 100);
      expect(effect.drawHandler).toBeNull();
      expect(effect.anatomyHandler).toEqual(expect.any(Function));
      expect(effect.endTime - effect.startTime).toBe(500);
      expect(collectAnatomyOverrides([effect], characterAnatomyContext, 100, 0))
        .toMatchObject([{ spriteKind:'farHand', transformType:'deferredHandDisplacement', weight:1 }]);
      expect(collectAnatomyOverrides([effect], characterAnatomyContext, 350, 0)).toMatchObject([{ weight:0.5 }]);
      expect(collectAnatomyOverrides([effect], characterAnatomyContext, 600, 0)).toMatchObject([{ weight:0 }]);
      expect(collectAnatomyOverrides([effect], characterAnatomyContext, 99, 0)).toEqual([]);
      expect(collectAnatomyOverrides([effect], characterAnatomyContext, 601, 0)).toEqual([]);
    });

    it('maps left and right destinations to opposite concrete hands in either ownership mapping', () => {
      const left = createTakeEffect(createDefaultItem(), LEFT_HAND, { x:5, y:10, z:0 }, 0, 100);
      const right = createTakeEffect(createDefaultItem(), RIGHT_HAND, { x:5, y:10, z:0 }, 0, 100);
      const reversed = { ...characterAnatomyContext, leftHandPartKind:'nearHand' as const };
      expect(collectAnatomyOverrides([left], characterAnatomyContext, 350, 0)).toMatchObject([{ spriteKind:'farHand' }]);
      expect(collectAnatomyOverrides([right], characterAnatomyContext, 350, 0)).toMatchObject([{ spriteKind:'nearHand' }]);
      expect(collectAnatomyOverrides([left], reversed, 350, 0)).toMatchObject([{ spriteKind:'nearHand' }]);
      expect(collectAnatomyOverrides([right], reversed, 350, 0)).toMatchObject([{ spriteKind:'farHand' }]);
    });

    it('reconstructs the source image center at the original insertion index rather than atop later items', () => {
      const source = { x:5, y:10, z:0 };
      const item = { ...createDefaultItem(), drawOffset:{ x:1, y:-2, z:0.5 } };
      const support = { ...createDefaultItem(), id:'support', isVisible:true, position:source, stackOffset:{ x:0, y:-4, z:0 } };
      const later = { ...support, id:'later', stackOffset:{ x:0, y:-12, z:0 } };
      const layout = createRoomContentDisplayLayout({ ...createDefaultRoom(), items:[support, later] }, []);
      const context = { ...characterAnatomyContext, roomContentDisplayLayout:layout };
      const position = layout.findProspectiveItemDisplayPosition(item, source, 1);
      expect(position).not.toEqual(layout.findProspectiveItemDisplayPosition(item, source));
      const anchor = getItemCanvasPositionInRoom(position, context.scalingFactors);
      const offset = context.roomItemCenterOffsetById.get(item.id)!;
      expect(offset).toBeDefined();
      const effect = createTakeEffect(item, RIGHT_HAND, source, 1, 100);
      expect(collectAnatomyOverrides([effect], context, 100, 0)).toEqual([{
        spriteKind:'nearHand', transformType:'deferredHandDisplacement',
        destinationCanvasPoint:[anchor[0] + offset[0], anchor[1] + offset[1]], weight:1
      }]);
    });

    it('resolves from the source center through an intermediate point to the current animated hand', () => {
      const effect = createTakeEffect(createDefaultItem(), RIGHT_HAND, { x:5, y:10, z:0 }, 0, 100);
      const root = createDefaultCharacterBody();
      const base = createBodyCanvasLayout(createBodyPose(root, 'standing', 'right'), [137, 251], characterAnatomyContext.scalingFactors);
      const rotation:SpriteOverride = { spriteKind:'nearArm', transformType:'rotate', rotateRadians:0.7 };
      const animated = createVisualBodyLayout(base, [rotation], 'right');
      const resolve = (time:number) => createVisualBodyLayout(base, aggregateSpriteOverrides([
        rotation, ...collectAnatomyOverrides([effect], characterAnatomyContext, time, 0)
      ], { rootBodyPart:root, facingDirection:'right' }), 'right');
      const source = resolve(100).rightHand;
      const middle = resolve(350).rightHand;
      expect(middle.x).toBeCloseTo((source.x + animated.rightHand.x) / 2);
      expect(middle.y).toBeCloseTo((source.y + animated.rightHand.y) / 2);
      expect(resolve(600)).toEqual(animated);
      expect(resolve(350).rightHand).toEqual(middle);
    });

    it('captures source data and preserves draw-only inventory transfers', () => {
      const item = createDefaultItem();
      const source = { x:5, y:10, z:0 };
      const effect = createTakeEffect(item, LEFT_HAND, source, 0, 100);
      const before = collectAnatomyOverrides([effect], characterAnatomyContext, 350, 0);
      source.x = 200;
      item.drawOffset.y = -100;
      expect(collectAnatomyOverrides([effect], characterAnatomyContext, 350, 999)).toEqual(before);
      const inventory = createTakeEffect(item, INVENTORY, source, 0, 100);
      expect(inventory.anatomyHandler).toBeNull();
      expect(inventory.drawHandler).toEqual(expect.any(Function));
      expect(collectAnatomyOverrides([inventory], characterAnatomyContext, 350, 0)).toEqual([]);
    });
  });
});