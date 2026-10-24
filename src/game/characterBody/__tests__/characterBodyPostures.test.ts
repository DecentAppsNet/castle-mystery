import { describe, expect, it } from 'vitest';
import { createBodyPose, createDefaultCharacterBody, getBodyBounds, getBodyPaintOrder,
  getResolvedBodyPart, transformBodyPoint } from '../index';
import BodyPart from '../types/BodyPart';

describe('character body postures', () => {
  it('places standing foot contact on the support surface', () => {
    const parts = createBodyPose(createDefaultCharacterBody(), 'standing', 'right');
    const feet = getBodyBounds([getResolvedBodyPart(parts, 'leftLeg'), getResolvedBodyPart(parts, 'rightLeg')]);

    expect(feet.y + feet.height).toBeCloseTo(0);
  });

  it('supports seated characters by their torso rather than dangling limbs', () => {
    const root = createDefaultCharacterBody();
    const sitting = createBodyPose(root, 'sitting', 'right');
    const kneeling = createBodyPose(root, 'kneeling', 'right');
    const sittingTorso = getBodyBounds([getResolvedBodyPart(sitting, 'torso')]);
    const kneelingTorso = getBodyBounds([getResolvedBodyPart(kneeling, 'torso')]);

    expect(sittingTorso.y + sittingTorso.height).toBeCloseTo(0);
    expect(kneelingTorso.y + kneelingTorso.height).toBeCloseTo(0);
  });

  it('points sitting legs forward and kneeling legs backward', () => {
    const root = createDefaultCharacterBody();
    const sitting = createBodyPose(root, 'sitting', 'right');
    const kneeling = createBodyPose(root, 'kneeling', 'right');

    for (const kind of ['leftLeg', 'rightLeg'] as const) {
      const forward = getResolvedBodyPart(sitting, kind);
      const backward = getResolvedBodyPart(kneeling, kind);
      const forwardHip = transformBodyPoint(forward.transform, forward.part.pivotPoint);
      const backwardHip = transformBodyPoint(backward.transform, backward.part.pivotPoint);
      const forwardTip = transformBodyPoint(forward.transform, [forward.part.pivotPoint[0], forward.part.height]);
      const backwardTip = transformBodyPoint(backward.transform, [backward.part.pivotPoint[0], backward.part.height]);

      expect(forwardTip[0]).toBeGreaterThan(forwardHip[0]);
      expect(backwardTip[0]).toBeLessThan(backwardHip[0]);
    }
  });

  it('keeps anatomical hand ownership when mirroring every posture', () => {
    const root = createDefaultCharacterBody();
    for (const orientation of ['standing', 'sitting', 'kneeling', 'laying'] as const) {
      const right = createBodyPose(root, orientation, 'right');
      const left = createBodyPose(root, orientation, 'left');
      for (const kind of ['leftArm', 'rightArm'] as const) {
        const rightArm = getResolvedBodyPart(right, kind);
        const leftArm = getResolvedBodyPart(left, kind);
        expect(leftArm.part).toBe(rightArm.part);
        const rightHand = transformBodyPoint(rightArm.transform, rightArm.part.handPoint!);
        const leftHand = transformBodyPoint(leftArm.transform, leftArm.part.handPoint!);
        const rightPivot = transformBodyPoint(rightArm.transform, rightArm.part.pivotPoint);
        const leftPivot = transformBodyPoint(leftArm.transform, leftArm.part.pivotPoint);
        expect(leftHand[0] - leftPivot[0]).toBeCloseTo(-(rightHand[0] - rightPivot[0]));
        expect(leftHand[1] - leftPivot[1]).toBeCloseTo(rightHand[1] - rightPivot[1]);
      }
    }
  });

  it('resolves facing-dependent limb attachments through the torso transform without changing definitions', () => {
    const root = createDefaultCharacterBody();
    const original = structuredClone(root);
    for (const orientation of ['standing', 'sitting', 'kneeling', 'laying'] as const) {
      for (const facing of ['left', 'right'] as const) {
        const parts = createBodyPose(root, orientation, facing);
        const torso = getResolvedBodyPart(parts, 'torso');
        for (const connection of root.connectedParts) {
          const child = getResolvedBodyPart(parts, connection.part.kind);
          const [connectionX, connectionY] = connection.connectionPoint;
          const reflect = facing === 'right' && connection.part.kind !== 'head';
          const expected = transformBodyPoint(torso.transform,
            [reflect ? root.width - connectionX : connectionX, connectionY]);
          const pivot = transformBodyPoint(child.transform, child.part.pivotPoint);
          expect(child.part).toBe(connection.part);
          expect(pivot[0]).toBeCloseTo(expected[0]);
          expect(pivot[1]).toBeCloseTo(expected[1]);
        }
      }
    }
    expect(root).toEqual(original);
  });

  it('does not let protruding children change seated or laying grounding', () => {
    const root = createDefaultCharacterBody();
    const oversized:BodyPart = { ...root, connectedParts:root.connectedParts.map(connection => ({
      ...connection, part:{ ...connection.part, width:connection.part.width * 100, height:connection.part.height * 100 }
    })) };
    for (const orientation of ['sitting', 'kneeling', 'laying'] as const) {
      for (const facing of ['left', 'right'] as const) {
        const normal = getResolvedBodyPart(createBodyPose(root, orientation, facing), 'torso');
        const protruding = getResolvedBodyPart(createBodyPose(oversized, orientation, facing), 'torso');
        expect(protruding.transform).toEqual(normal.transform);
      }
    }
  });

  it('paints the near arm over the torso and the far arm behind it', () => {
    const right = getBodyPaintOrder('right');
    const left = getBodyPaintOrder('left');

    expect(right.indexOf('leftArm')).toBeLessThan(right.indexOf('torso'));
    expect(right.indexOf('rightArm')).toBeGreaterThan(right.indexOf('torso'));
    expect(left.indexOf('rightArm')).toBeLessThan(left.indexOf('torso'));
    expect(left.indexOf('leftArm')).toBeGreaterThan(left.indexOf('torso'));
  });
});