import { describe, expect, it } from 'vitest';

import { getBodyBounds, getResolvedBodyPart, resolveBodyHierarchy,
  composeBodyTransforms, createBodyAttachmentTransform, transformBodyPoint, transformBodyRect } from '../index';
import { createRect, isPositionInOrOnRect } from '@/game/rectUtil';
import BodyPart from '../types/BodyPart';
import BodyPartTransform from '../types/BodyPartTransform';

const HAND:BodyPart = {
  kind:'leftArm', imageUrl:null, width:4, height:6, pivotPoint:[1, 2], handPoint:[3, 5], connectedParts:[]
};
const HEAD:BodyPart = {
  kind:'head', imageUrl:null, width:3, height:5, pivotPoint:[2, 4], handPoint:null,
  connectedParts:[{ part:HAND, connectionPoint:[1, 3] }]
};
const ROOT:BodyPart = {
  kind:'torso', imageUrl:null, width:4, height:8, pivotPoint:[2, 8], handPoint:null,
  connectedParts:[{ part:HEAD, connectionPoint:[2, 0] }]
};

describe('characterBodyPoseUtil', () => {
  describe('resolveBodyHierarchy()', () => {
    it('attaches a rotated noncentral child pivot to the transformed parent connection', () => {
      const rootTransform = createBodyAttachmentTransform([20, 30], ROOT.pivotPoint, Math.PI / 4);
      const parts = resolveBodyHierarchy(ROOT, rootTransform, { head:Math.PI / 3 });
      const head = getResolvedBodyPart(parts, 'head');
      const pivot = transformBodyPoint(head.transform, HEAD.pivotPoint);
      const connection = transformBodyPoint(rootTransform, ROOT.connectedParts[0].connectionPoint);

      expect(pivot[0]).toBeCloseTo(connection[0]);
      expect(pivot[1]).toBeCloseTo(connection[1]);
      expect(head.part).toBe(HEAD);
    });

    it('inherits ancestor rotations and translation for nested hand and center points', () => {
      const rootTransform = createBodyAttachmentTransform([20, 30], ROOT.pivotPoint, Math.PI / 2);
      const parts = resolveBodyHierarchy(ROOT, rootTransform, { head:Math.PI / 2 });
      const arm = getResolvedBodyPart(parts, 'leftArm');
      const hand = transformBodyPoint(arm.transform, HAND.handPoint!);
      const torsoCenter = transformBodyPoint(getResolvedBodyPart(parts, 'torso').transform, [2, 4]);
      const headCenter = transformBodyPoint(getResolvedBodyPart(parts, 'head').transform, [1.5, 2.5]);

      expect(hand[0]).toBeCloseTo(27);
      expect(hand[1]).toBeCloseTo(28);
      expect(torsoCenter[0]).toBeCloseTo(24);
      expect(torsoCenter[1]).toBeCloseTo(30);
      expect(headCenter[0]).toBeCloseTo(28.5);
      expect(headCenter[1]).toBeCloseTo(31.5);
    });

    it('resolves twice without changing definition values or references', () => {
      const before = structuredClone(ROOT);
      const connections = ROOT.connectedParts;
      const transform = createBodyAttachmentTransform([10, 20], ROOT.pivotPoint);
      const first = resolveBodyHierarchy(ROOT, transform);
      const second = resolveBodyHierarchy(ROOT, transform);

      expect(ROOT).toEqual(before);
      expect(ROOT.connectedParts).toBe(connections);
      expect(ROOT.connectedParts[0].part).toBe(HEAD);
      expect(HEAD.connectedParts[0].part).toBe(HAND);
      expect(second).toEqual(first);
      expect(first[0].part).toBe(ROOT);
      expect(second[2].part).toBe(HAND);
      expect(second).not.toBe(first);
    });
  });

  describe('getBodyBounds()', () => {
    it('contains every transformed corner of a rotated and reflected hierarchy', () => {
      const reflection:BodyPartTransform = {
        horizontalX:-1, horizontalY:0, verticalX:0, verticalY:1, translateX:50, translateY:60
      };
      const rootTransform = composeBodyTransforms(reflection,
        createBodyAttachmentTransform([0, 0], ROOT.pivotPoint, Math.PI / 4));
      const parts = resolveBodyHierarchy(ROOT, rootTransform, { head:Math.PI / 3 });
      const bounds = getBodyBounds(parts);

      for (const { part, transform } of parts) {
        const corners = [[0, 0], [part.width, 0], [0, part.height], [part.width, part.height]] as const;
        for (const corner of corners) {
          const point = transformBodyPoint(transform, corner);
          expect(isPositionInOrOnRect(point[0], point[1], bounds)).toBe(true);
        }
      }
    });

    it('unions separated parts without including an unrelated origin', () => {
      const rootTransform = createBodyAttachmentTransform([100, 200], ROOT.pivotPoint);
      const bounds = getBodyBounds(resolveBodyHierarchy(ROOT, rootTransform));

      expect(bounds).toEqual(createRect(98, 188, 4, 12));
    });
  });

  describe('transformBodyRect()', () => {
    it('uses all four corners for an off-origin rectangle under rotation and reflection', () => {
      const transform:BodyPartTransform = {
        horizontalX:-Math.SQRT1_2, horizontalY:Math.SQRT1_2,
        verticalX:Math.SQRT1_2, verticalY:Math.SQRT1_2, translateX:10, translateY:20
      };
      const bounds = transformBodyRect(transform, createRect(2, 3, 4, 6));

      expect(bounds.x).toBeCloseTo(10 - 3 * Math.SQRT1_2);
      expect(bounds.y).toBeCloseTo(20 + 5 * Math.SQRT1_2);
      expect(bounds.width).toBeCloseTo(10 * Math.SQRT1_2);
      expect(bounds.height).toBeCloseTo(10 * Math.SQRT1_2);
    });
  });
});