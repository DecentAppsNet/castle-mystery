import { describe, expect, it } from 'vitest';
import { createBodyCanvasLayout, createBodyPose, createDefaultCharacterBody, createRasterCharacterBody, getBodyBounds,
  getResolvedBodyPart, replaceHeadImage, transformBodyPoint } from '../index';
import rasterBody from './fixtures/rasterBody';
import { createVisualBodyLayout } from '../characterBodyLayoutUtil';
import { applyBodyTransformDeltas, composeBodyTransforms, createBodyAttachmentTransform } from '../characterBodyTransformUtil';
import { rotateHeadPose } from '../characterHeadGeometryUtil';
import { aggregateSpriteOverrides } from '@/game/effects/spriteOverrideUtil';

describe('characterBodyLayoutUtil', () => {
  describe('createVisualBodyLayout()', () => {
    it('preserves the complete base layout with zero contributions', () => {
      const root = createDefaultCharacterBody();
      const base = createBodyCanvasLayout(createBodyPose(root, 'sitting', 'left'), [137, 251], { scaleX:3, scaleY:5 }, 'left');
      expect(createVisualBodyLayout(base, [], 'left')).toEqual(base);
      expect(createVisualBodyLayout(base, [
        { spriteKind:'nearArm', transformType:'rotate', rotateRadians:0 },
        { spriteKind:'leftLeg', transformType:'translatePartHeight', translateHeightRatio:0 }
      ], 'left')).toEqual(base);
    });

    it('keeps hands on animated arms through posture, reflection, and unequal projection scales', () => {
      for (const root of [createDefaultCharacterBody(), createRasterCharacterBody(rasterBody)]) {
        for (const facing of ['left', 'right'] as const) {
          for (const posture of ['standing', 'sitting', 'kneeling', 'laying'] as const) {
            const base = createBodyCanvasLayout(createBodyPose(root, posture, facing), [137, 251], { scaleX:3, scaleY:5 }, facing);
            const before = structuredClone(base);
            const overrides = aggregateSpriteOverrides([
              { spriteKind:'nearArm', transformType:'rotate', rotateRadians:0.2 },
              { spriteKind:'nearArm', transformType:'rotate', rotateRadians:0.3 },
              { spriteKind:'farArm', transformType:'rotate', rotateRadians:-0.4 }
            ], { rootBodyPart:root, facingDirection:facing });
            const visual = createVisualBodyLayout(base, overrides, facing);
            for (const kind of ['nearArm', 'farArm'] as const) {
              const original = getResolvedBodyPart(base.parts, kind);
              const arm = getResolvedBodyPart(visual.parts, kind);
              const hand = getResolvedBodyPart(visual.parts, kind === 'nearArm' ? 'nearHand' : 'farHand');
              const expected = applyBodyTransformDeltas(original.transform, original.part.pivotPoint, kind === 'nearArm' ? 0.5 : -0.4, [0, 0]);
              expect(arm.transform).toEqual(expected);
              const connection = transformBodyPoint(arm.transform, arm.part.connectedParts[0].connectionPoint);
              const origin = transformBodyPoint(hand.transform, [0, 0]);
              expect(origin[0]).toBeCloseTo(connection[0]);
              expect(origin[1]).toBeCloseTo(connection[1]);
              const pivot = transformBodyPoint(arm.transform, arm.part.pivotPoint);
              const originalPivot = transformBodyPoint(original.transform, original.part.pivotPoint);
              expect(pivot[0]).toBeCloseTo(originalPivot[0]);
              expect(pivot[1]).toBeCloseTo(originalPivot[1]);
            }
            const leftKind = root.imageUrl !== null && facing === 'left' ? 'nearHand' : 'farHand';
            const leftOrigin = transformBodyPoint(getResolvedBodyPart(visual.parts, leftKind).transform, [0, 0]);
            expect([visual.leftHand.x, visual.leftHand.y]).toEqual(leftOrigin);
            expect(visual.bounds).toBe(base.bounds);
            expect(visual.head).toBe(base.head);
            expect(visual.characterCenterCanvasPoint).toBe(base.characterCenterCanvasPoint);
            expect(visual.anchorX).toBe(base.anchorX);
            expect(visual.anchorTopY).toBe(base.anchorTopY);
            for (const resolved of visual.parts) expect(resolved.part).toBe(getResolvedBodyPart(base.parts, resolved.part.kind).part);
            expect(base).toEqual(before);
          }
        }
      }
    });

    it('preserves reflected head rotation and canvas-Y leg displacement without regrounding', () => {
      const root = replaceHeadImage(createDefaultCharacterBody(), '/assets/bodies/head.png');
      for (const facing of ['left', 'right'] as const) {
        const base = createBodyCanvasLayout(createBodyPose(root, 'laying', facing), [137, 251], { scaleX:3, scaleY:5 }, facing);
        const visual = createVisualBodyLayout(base, [
          { spriteKind:'head', transformType:'rotate', rotateRadians:0.3 },
          { spriteKind:'leftLeg', transformType:'translatePartHeight', translateHeightRatio:-0.25 }
        ], facing);
        expect(getResolvedBodyPart(visual.parts, 'head')).toEqual(rotateHeadPose(getResolvedBodyPart(base.parts, 'head'), facing, 0.3));
        const originalLeg = getResolvedBodyPart(base.parts, 'leftLeg');
        const leg = getResolvedBodyPart(visual.parts, 'leftLeg');
        const shift = -0.25 * leg.part.height * Math.hypot(originalLeg.transform.verticalX, originalLeg.transform.verticalY);
        expect(leg.transform).toEqual({ ...originalLeg.transform, translateY:originalLeg.transform.translateY + shift });
        expect(getResolvedBodyPart(visual.parts, 'torso')).toEqual(getResolvedBodyPart(base.parts, 'torso'));
        expect(visual.bounds).toBe(base.bounds);
      }
    });

    it('keeps the headless placeholder unchanged by head rotation', () => {
      const base = createBodyCanvasLayout(createBodyPose(createDefaultCharacterBody(), 'standing', 'right'), [0, 0], { scaleX:3, scaleY:5 });
      expect(createVisualBodyLayout(base, [{ spriteKind:'head', transformType:'rotate', rotateRadians:0.3 }], 'right')).toEqual(base);
    });

    it('inherits both ancestor and arm deltas exactly once without depending on override order', () => {
      const original = createDefaultCharacterBody();
      const armConnection = original.connectedParts[2];
      const root = { ...original, connectedParts:original.connectedParts.filter(({ part }) => part.kind !== 'nearArm')
        .map(connection => connection.part.kind === 'head' ? { ...connection, part:{ ...connection.part,
          imageUrl:'/assets/bodies/head.png', connectedParts:[armConnection] } } : connection) };
      for (const facing of ['left', 'right'] as const) {
        const base = createBodyCanvasLayout(createBodyPose(root, 'laying', facing), [137, 251], { scaleX:3, scaleY:5 }, facing);
        const before = structuredClone(base);
        const overrides = aggregateSpriteOverrides([
          { spriteKind:'head', transformType:'rotate', rotateRadians:0.2 },
          { spriteKind:'nearArm', transformType:'rotate', rotateRadians:-0.4 }
        ], { rootBodyPart:root, facingDirection:facing });
        const visual = createVisualBodyLayout(base, overrides, facing);
        const head = rotateHeadPose(getResolvedBodyPart(base.parts, 'head'), facing, 0.2);
        const inheritedArm = composeBodyTransforms(head.transform,
          createBodyAttachmentTransform(armConnection.connectionPoint, armConnection.part.pivotPoint));
        const expectedArm = applyBodyTransformDeltas(inheritedArm, armConnection.part.pivotPoint, -0.4, [0, 0]);
        const handConnection = armConnection.part.connectedParts[0];
        const expectedOrigin = transformBodyPoint(expectedArm, handConnection.connectionPoint);
        const hand = getResolvedBodyPart(visual.parts, 'nearHand');
        const origin = transformBodyPoint(hand.transform, [0, 0]);
        expect(origin[0]).toBeCloseTo(expectedOrigin[0]);
        expect(origin[1]).toBeCloseTo(expectedOrigin[1]);
        const arm = getResolvedBodyPart(visual.parts, 'nearArm');
        for (const point of [arm.part.pivotPoint, [arm.part.width, arm.part.height]] as const) {
          const actual = transformBodyPoint(arm.transform, point);
          const expected = transformBodyPoint(expectedArm, point);
          expect(actual[0]).toBeCloseTo(expected[0]);
          expect(actual[1]).toBeCloseTo(expected[1]);
        }
        expect(createVisualBodyLayout(base, [...overrides].reverse(), facing)).toEqual(visual);
        expect(createVisualBodyLayout(base, overrides, facing)).toEqual(visual);
        expect(base).toEqual(before);
      }
    });
  });

  describe('createBodyCanvasLayout()', () => {
    it('maps raster arm roles to character-relative hands across postures and facings', () => {
      const root = createRasterCharacterBody(rasterBody, 460);
      for (const orientation of ['standing', 'sitting', 'kneeling', 'laying'] as const) {
        for (const facing of ['right', 'left'] as const) {
          const layout = createBodyCanvasLayout(createBodyPose(root, orientation, facing),
            [137, 251], { scaleX:3, scaleY:5 }, facing);
          const leftHand = getResolvedBodyPart(layout.parts, facing === 'left' ? 'nearHand' : 'farHand');
          const rightHand = getResolvedBodyPart(layout.parts, facing === 'left' ? 'farHand' : 'nearHand');
          expect([layout.leftHand.x, layout.leftHand.y]).toEqual(
            transformBodyPoint(leftHand.transform, [0, 0]));
          expect([layout.rightHand.x, layout.rightHand.y]).toEqual(
            transformBodyPoint(rightHand.transform, [0, 0]));
        }
      }
    });

    it('retains vector hand ownership across postures and facings, including raster heads', () => {
      const root = createDefaultCharacterBody();
      for (const body of [root, replaceHeadImage(root, '/assets/bodies/head.png')]) {
        for (const orientation of ['standing', 'sitting', 'kneeling', 'laying'] as const) {
          for (const facing of ['right', 'left'] as const) {
            const layout = createBodyCanvasLayout(createBodyPose(body, orientation, facing),
              [137, 251], { scaleX:3, scaleY:5 }, facing);
            const leftHand = getResolvedBodyPart(layout.parts, 'farHand');
            const rightHand = getResolvedBodyPart(layout.parts, 'nearHand');
            expect([layout.leftHand.x, layout.leftHand.y]).toEqual(transformBodyPoint(leftHand.transform, [0, 0]));
            expect([layout.rightHand.x, layout.rightHand.y]).toEqual(transformBodyPoint(rightHand.transform, [0, 0]));
          }
        }
      }
    });

    it('projects every part after laying rotation while preserving definition references', () => {
      const pose = createBodyPose(createDefaultCharacterBody(), 'laying', 'left');
      const layout = createBodyCanvasLayout(pose, [137, 251], { scaleX:3, scaleY:5 });

      for (const original of pose) {
        const projected = getResolvedBodyPart(layout.parts, original.part.kind);
        expect(projected.part).toBe(original.part);
        for (const point of [original.part.pivotPoint, [original.part.width, original.part.height]] as const) {
          const local = transformBodyPoint(original.transform, point);
          const canvas = transformBodyPoint(projected.transform, point);
          expect(canvas[0]).toBeCloseTo(137 + local[0] * 3);
          expect(canvas[1]).toBeCloseTo(251 + local[1] * 5);
        }
      }
    });

    it('derives hand and center summaries from the same projected parts', () => {
      const pose = createBodyPose(createDefaultCharacterBody(), 'sitting', 'right');
      const layout = createBodyCanvasLayout(pose, [137, 251], { scaleX:3, scaleY:5 });
      const torso = getResolvedBodyPart(layout.parts, 'torso');
      const head = getResolvedBodyPart(layout.parts, 'head');
      expect(layout.characterCenterCanvasPoint).toEqual(transformBodyPoint(torso.transform,
        [torso.part.width / 2, torso.part.height / 2]));
      expect([layout.head.centerX, layout.head.centerY]).toEqual(transformBodyPoint(head.transform,
        [head.part.width / 2, head.part.height / 2]));
      const farHand = getResolvedBodyPart(layout.parts, 'farHand');
      const nearHand = getResolvedBodyPart(layout.parts, 'nearHand');
      const leftHand = transformBodyPoint(farHand.transform, [0, 0]);
      const rightHand = transformBodyPoint(nearHand.transform, [0, 0]);
      expect(layout.leftHand.x).toBeCloseTo(leftHand[0]);
      expect(layout.leftHand.y).toBeCloseTo(leftHand[1]);
      expect(layout.rightHand.x).toBeCloseTo(rightHand[0]);
      expect(layout.rightHand.y).toBeCloseTo(rightHand[1]);
      expect(layout.bounds).toEqual(getBodyBounds(layout.parts));
      expect(layout.anchorX).toBe(layout.head.centerX);
      expect(layout.anchorTopY).toBe(layout.bounds.y);
    });

    it('anchors bubbles horizontally on the head when laying right', () => {
      const pose = createBodyPose(createDefaultCharacterBody(), 'laying', 'right');
      const layout = createBodyCanvasLayout(pose, [137, 251], { scaleX:3, scaleY:5 });
      expect(layout.anchorX).toBe(layout.head.centerX);
    });

    it('anchors bubbles horizontally on the head when laying left', () => {
      const pose = createBodyPose(createDefaultCharacterBody(), 'laying', 'left');
      const layout = createBodyCanvasLayout(pose, [137, 251], { scaleX:3, scaleY:5 });
      expect(layout.anchorX).toBe(layout.head.centerX);
    });

    it('keeps standing feet on the supplied support', () => {
      const pose = createBodyPose(createDefaultCharacterBody(), 'standing', 'left');
      const layout = createBodyCanvasLayout(pose, [137, 251], { scaleX:3, scaleY:5 });
      const feet = getBodyBounds([getResolvedBodyPart(layout.parts, 'leftLeg'), getResolvedBodyPart(layout.parts, 'rightLeg')]);
      expect(feet.y + feet.height).toBeCloseTo(251);
    });

    it('keeps the laying torso on the supplied support with unequal view scales', () => {
      const pose = createBodyPose(createDefaultCharacterBody(), 'laying', 'right');
      const layout = createBodyCanvasLayout(pose, [137, 251], { scaleX:3, scaleY:5 });
      const torso = getBodyBounds([getResolvedBodyPart(layout.parts, 'torso')]);
      expect(torso.y + torso.height).toBeCloseTo(251);
    });

    it('keeps the transfer center on the torso when head geometry changes', () => {
      const root = createDefaultCharacterBody();
      const enlargedHead = { ...root, connectedParts:root.connectedParts.map(connection =>
        connection.part.kind === 'head'
          ? { ...connection, part:{ ...connection.part, width:connection.part.width * 4 } }
          : connection) };
      const original = createBodyCanvasLayout(createBodyPose(root, 'sitting', 'right'), [137, 251], { scaleX:3, scaleY:5 });
      const enlarged = createBodyCanvasLayout(createBodyPose(enlargedHead, 'sitting', 'right'), [137, 251], { scaleX:3, scaleY:5 });

      expect(enlarged.bounds.width).toBeGreaterThan(original.bounds.width);
      expect(enlarged.characterCenterCanvasPoint).toEqual(original.characterCenterCanvasPoint);
      const torso = getBodyBounds([getResolvedBodyPart(enlarged.parts, 'torso')]);
      expect(torso.y + torso.height).toBeCloseTo(251);
    });

    it('translates the complete layout without changing its size or logical head radius', () => {
      const pose = createBodyPose(createDefaultCharacterBody(), 'kneeling', 'left');
      const original = createBodyCanvasLayout(pose, [0, 0], { scaleX:3, scaleY:5 });
      const translated = createBodyCanvasLayout(pose, [137, 251], { scaleX:3, scaleY:5 });
      expect(translated.bounds.x).toBeCloseTo(original.bounds.x + 137);
      expect(translated.bounds.y).toBeCloseTo(original.bounds.y + 251);
      expect(translated.bounds.width).toBeCloseTo(original.bounds.width);
      expect(translated.bounds.height).toBeCloseTo(original.bounds.height);
      expect(translated.head.radius).toBeCloseTo(original.head.radius);
      expect(translated.characterCenterCanvasPoint[0]).toBeCloseTo(original.characterCenterCanvasPoint[0] + 137);
      expect(translated.characterCenterCanvasPoint[1]).toBeCloseTo(original.characterCenterCanvasPoint[1] + 251);
    });
  });
});