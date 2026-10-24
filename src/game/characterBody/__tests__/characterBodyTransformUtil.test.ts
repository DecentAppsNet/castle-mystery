import { describe, expect, it } from 'vitest';

import { composeBodyTransforms, createBodyAttachmentTransform, transformBodyPoint } from '../index';
import BodyPartTransform from '../types/BodyPartTransform';

describe('characterBodyTransformUtil', () => {
  describe('createBodyAttachmentTransform()', () => {
    it('leaves a point unchanged for an origin attachment without rotation', () => {
      const transform = createBodyAttachmentTransform([0, 0], [0, 0]);

      expect(transformBodyPoint(transform, [3, 4])).toEqual([3, 4]);
    });

    it('translates a nonzero pivot onto its connection', () => {
      const transform = createBodyAttachmentTransform([10, 20], [2, 3]);

      expect(transformBodyPoint(transform, [2, 3])).toEqual([10, 20]);
      expect(transformBodyPoint(transform, [4, 6])).toEqual([12, 23]);
    });

    it('rotates about a nonzero pivot without detaching it', () => {
      const transform = createBodyAttachmentTransform([10, 20], [2, 3], Math.PI / 2);
      const pivot = transformBodyPoint(transform, [2, 3]);
      const tip = transformBodyPoint(transform, [4, 3]);

      expect(pivot[0]).toBeCloseTo(10);
      expect(pivot[1]).toBeCloseTo(20);
      expect(tip[0]).toBeCloseTo(10);
      expect(tip[1]).toBeCloseTo(22);
    });
  });

  describe('composeBodyTransforms()', () => {
    it('preserves a transform when composed with identity on either side', () => {
      const identity = createBodyAttachmentTransform([0, 0], [0, 0]);
      const transform = createBodyAttachmentTransform([10, 20], [2, 3], Math.PI / 4);

      expect(composeBodyTransforms(identity, transform)).toEqual(transform);
      expect(composeBodyTransforms(transform, identity)).toEqual(transform);
    });

    it('applies the child before its rotated and translated parent', () => {
      const parent = createBodyAttachmentTransform([100, 200], [0, 0], Math.PI / 2);
      const child = createBodyAttachmentTransform([4, 5], [1, 2], Math.PI / 2);
      const combined = composeBodyTransforms(parent, child);
      const pivot = transformBodyPoint(combined, [1, 2]);
      const tip = transformBodyPoint(combined, [3, 2]);

      expect(pivot[0]).toBeCloseTo(95);
      expect(pivot[1]).toBeCloseTo(204);
      expect(tip[0]).toBeCloseTo(93);
      expect(tip[1]).toBeCloseTo(204);
    });

    it('reflects a canonical rotation without changing anatomical attachment', () => {
      const reflection:BodyPartTransform = {
        horizontalX:-1, horizontalY:0, verticalX:0, verticalY:1, translateX:0, translateY:0
      };
      const attachment = createBodyAttachmentTransform([4, 5], [1, 2], Math.PI / 2);
      const reflected = composeBodyTransforms(reflection, attachment);
      const pivot = transformBodyPoint(reflected, [1, 2]);
      const tip = transformBodyPoint(reflected, [3, 2]);

      expect(pivot[0]).toBeCloseTo(-4);
      expect(pivot[1]).toBeCloseTo(5);
      expect(tip[0]).toBeCloseTo(-4);
      expect(tip[1]).toBeCloseTo(7);
    });

    it('applies separate view scales after rotation and adds the world anchor once', () => {
      const view:BodyPartTransform = {
        horizontalX:2, horizontalY:0, verticalX:0, verticalY:3, translateX:100, translateY:200
      };
      const local = createBodyAttachmentTransform([4, 5], [1, 2], Math.PI / 4);
      const projected = composeBodyTransforms(view, local);
      const pivot = transformBodyPoint(projected, [1, 2]);
      const tip = transformBodyPoint(projected, [3, 2]);

      expect(pivot[0]).toBeCloseTo(108);
      expect(pivot[1]).toBeCloseTo(215);
      expect(tip[0]).toBeCloseTo(108 + 2 * Math.SQRT2);
      expect(tip[1]).toBeCloseTo(215 + 3 * Math.SQRT2);
    });
  });
});