import { describe, expect, it } from 'vitest';
import { createDropEffect } from '../dropEffectUtil';
import { collectAnatomyOverrides, aggregateSpriteOverrides } from '../spriteOverrideUtil';
import { INVENTORY, LEFT_HAND, RIGHT_HAND } from '@/game/itemOwnershipUtil';
import { createDefaultItem } from '@/game/types/Item';
import { createDefaultRoom } from '@/game/types/Room';
import { createRoomContentDisplayLayout } from '@/game/roomContentDisplayPositionUtil';
import { getItemCanvasPositionInRoom } from '@/game/drawing/itemDrawUtil';
import { createBodyCanvasLayout, createBodyPose, createDefaultCharacterBody, createVisualBodyLayout } from '@/game/characterBody';
import characterAnatomyContext from './fixtures/characterAnatomyContext';

describe('dropEffectUtil', () => {
  describe('createDropEffect()', () => {
    it('produces hand anatomy without drawing, with zero, intermediate, and full progress', () => {
      const effect = createDropEffect(createDefaultItem(), LEFT_HAND, { x:5, y:10, z:0 }, 100);
      expect(effect.drawHandler).toBeNull();
      expect(effect.anatomyHandler).toEqual(expect.any(Function));
      expect(effect.endTime - effect.startTime).toBe(500);
      expect(collectAnatomyOverrides([effect], characterAnatomyContext, 100, 0))
        .toMatchObject([{ spriteKind:'farHand', transformType:'deferredHandDisplacement', weight:0 }]);
      expect(collectAnatomyOverrides([effect], characterAnatomyContext, 350, 0)).toMatchObject([{ weight:0.5 }]);
      expect(collectAnatomyOverrides([effect], characterAnatomyContext, 600, 0)).toMatchObject([{ weight:1 }]);
      expect(collectAnatomyOverrides([effect], characterAnatomyContext, 99, 0)).toEqual([]);
      expect(collectAnatomyOverrides([effect], characterAnatomyContext, 601, 0)).toEqual([]);
    });

    it('selects the supplied left hand and its opposite for right-hand drops', () => {
      const left = createDropEffect(createDefaultItem(), LEFT_HAND, { x:5, y:10, z:0 }, 100);
      const right = createDropEffect(createDefaultItem(), RIGHT_HAND, { x:5, y:10, z:0 }, 100);
      const reversed = { ...characterAnatomyContext, leftHandPartKind:'nearHand' as const };
      expect(collectAnatomyOverrides([left], characterAnatomyContext, 350, 0)).toMatchObject([{ spriteKind:'farHand' }]);
      expect(collectAnatomyOverrides([right], characterAnatomyContext, 350, 0)).toMatchObject([{ spriteKind:'nearHand' }]);
      expect(collectAnatomyOverrides([left], reversed, 350, 0)).toMatchObject([{ spriteKind:'nearHand' }]);
      expect(collectAnatomyOverrides([right], reversed, 350, 0)).toMatchObject([{ spriteKind:'farHand' }]);
    });

    it('converts the prospective room base anchor to its image center exactly once', () => {
      const destination = { x:5, y:10, z:0 };
      const item = { ...createDefaultItem(), drawOffset:{ x:1, y:-2, z:0.5 } };
      const support = { ...createDefaultItem(), id:'support', isVisible:true, position:destination,
        drawOffset:{ x:0, y:-1, z:0 }, stackOffset:{ x:2, y:-4, z:0 } };
      const room = { ...createDefaultRoom(), items:[support] };
      const context = { ...characterAnatomyContext, roomContentDisplayLayout:createRoomContentDisplayLayout(room, []) };
      const position = context.roomContentDisplayLayout.findProspectiveItemDisplayPosition(item, destination);
      const roomAnchor = getItemCanvasPositionInRoom(position, context.scalingFactors);
      const centerOffset = context.roomItemCenterOffsetById.get(item.id)!;
      expect(centerOffset).toBeDefined();
      const expected = [roomAnchor[0] + centerOffset[0], roomAnchor[1] + centerOffset[1]];
      const effect = createDropEffect(item, RIGHT_HAND, destination, 100);
      const contributions = collectAnatomyOverrides([effect], context, 600, 0);
      expect(contributions).toEqual([{ spriteKind:'nearHand', transformType:'deferredHandDisplacement',
        destinationCanvasPoint:expected, weight:1 }]);
      const root = createDefaultCharacterBody();
      const base = createBodyCanvasLayout(createBodyPose(root, 'standing', 'right'), [137, 251], context.scalingFactors);
      const result = createVisualBodyLayout(base, aggregateSpriteOverrides(contributions,
        { rootBodyPart:root, facingDirection:'right' }), 'right');
      expect(result.rightHand.x).toBeCloseTo(expected[0]);
      expect(result.rightHand.y).toBeCloseTo(expected[1]);
    });

    it('captures item and destination inputs and remains deterministic across repeated or reordered samples', () => {
      const item = createDefaultItem();
      const destination = { x:5, y:10, z:0 };
      const effect = createDropEffect(item, LEFT_HAND, destination, 100);
      const initial = collectAnatomyOverrides([effect], characterAnatomyContext, 350, 0);
      item.drawOffset.x = 100;
      destination.x = 200;
      collectAnatomyOverrides([effect], characterAnatomyContext, 550, 999);
      collectAnatomyOverrides([effect], characterAnatomyContext, 100, 0);
      expect(collectAnatomyOverrides([effect], characterAnatomyContext, 350, 123)).toEqual(initial);
    });

    it('retains draw-only inventory transfers without anatomy displacement', () => {
      const effect = createDropEffect(createDefaultItem(), INVENTORY, { x:5, y:10, z:0 }, 100);
      expect(effect.anatomyHandler).toBeNull();
      expect(effect.drawHandler).toEqual(expect.any(Function));
      expect(collectAnatomyOverrides([effect], characterAnatomyContext, 350, 0)).toEqual([]);
      expect(effect.endTime - effect.startTime).toBe(500);
    });
  });
});