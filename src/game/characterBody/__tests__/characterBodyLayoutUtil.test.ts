import { describe, expect, it } from 'vitest';
import { createBodyCanvasLayout, createBodyPose, createDefaultCharacterBody, createRasterCharacterBody, getBodyBounds,
  getResolvedBodyPart, transformBodyPoint } from '../index';
import rasterBody from './fixtures/rasterBody';

describe('characterBodyLayoutUtil', () => {
  describe('createBodyCanvasLayout()', () => {
    it('maps raster arm roles to character-relative hands across postures and facings', () => {
      const root = createRasterCharacterBody(rasterBody, 460);
      for (const orientation of ['standing', 'sitting', 'kneeling', 'laying'] as const) {
        for (const facing of ['right', 'left'] as const) {
          const layout = createBodyCanvasLayout(createBodyPose(root, orientation, facing),
            [137, 251], { scaleX:3, scaleY:5 }, facing);
          const leftHandArm = getResolvedBodyPart(layout.parts, facing === 'left' ? 'nearArm' : 'farArm');
          const rightHandArm = getResolvedBodyPart(layout.parts, facing === 'left' ? 'farArm' : 'nearArm');
          expect([layout.leftHand.x, layout.leftHand.y]).toEqual(
            transformBodyPoint(leftHandArm.transform, leftHandArm.part.handPoint!));
          expect([layout.rightHand.x, layout.rightHand.y]).toEqual(
            transformBodyPoint(rightHandArm.transform, rightHandArm.part.handPoint!));
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
      const farArm = getResolvedBodyPart(layout.parts, 'farArm');
      const nearArm = getResolvedBodyPart(layout.parts, 'nearArm');
      expect([layout.leftHand.x, layout.leftHand.y]).toEqual(transformBodyPoint(farArm.transform, farArm.part.handPoint!));
      expect([layout.rightHand.x, layout.rightHand.y]).toEqual(transformBodyPoint(nearArm.transform, nearArm.part.handPoint!));
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