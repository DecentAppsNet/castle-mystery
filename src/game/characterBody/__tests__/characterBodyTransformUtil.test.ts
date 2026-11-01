import { describe, expect, it } from 'vitest';

import { applyBodyTransformDeltas, composeBodyTransforms, createBodyAttachmentTransform, createCanvasAttachmentTransform, transformBodyPoint, transformBodyRect } from '../characterBodyTransformUtil';
import BodyPartTransform from '../types/BodyPartTransform';

describe('characterBodyTransformUtil', () => {
  describe('transformBodyRect()', () => {
    it('encloses a centered rectangle after reflected rotation and unequal projection without mutating inputs', () => {
      const transform:BodyPartTransform = Object.freeze({
        horizontalX:-1.2, horizontalY:2.4, verticalX:1.6, verticalY:1.8, translateX:100, translateY:200
      });
      const rect = Object.freeze({ x:-5, y:-10, width:10, height:20 });
      const bounds = transformBodyRect(transform, rect);
      expect(bounds.x).toBeCloseTo(78);
      expect(bounds.y).toBeCloseTo(170);
      expect(bounds.width).toBeCloseTo(44);
      expect(bounds.height).toBeCloseTo(60);
      expect(bounds.x + bounds.width / 2).toBeCloseTo(100);
      expect(bounds.y + bounds.height / 2).toBeCloseTo(200);
    });

    it('applies fixed canvas displacement once without changing rotated bounds dimensions', () => {
      const transform = createBodyAttachmentTransform([100, 200], [0, 0], Math.PI / 3);
      const rect = { x:-5, y:-10, width:10, height:20 };
      const original = transformBodyRect(transform, rect);
      const displaced = transformBodyRect({ ...transform,
        translateX:transform.translateX + 17, translateY:transform.translateY - 9 }, rect);
      expect(displaced.x - original.x).toBeCloseTo(17);
      expect(displaced.y - original.y).toBeCloseTo(-9);
      expect(displaced.width).toBeCloseTo(original.width);
      expect(displaced.height).toBeCloseTo(original.height);
    });
  });

  describe('createCanvasAttachmentTransform()', () => {
    it('keeps already-sized artwork unchanged at an unrotated attachment despite body and view scaling', () => {
      const transform:BodyPartTransform = {
        horizontalX:8, horizontalY:0, verticalX:0, verticalY:12, translateX:100, translateY:200
      };
      const result = createCanvasAttachmentTransform(transform, { scaleX:2, scaleY:3 });
      expect(transformBodyPoint(result, [0, 0])).toEqual([100, 200]);
      expect(transformBodyPoint(result, [10, 20])).toEqual([110, 220]);
    });

    it('preserves reflected orientation in game space before unequal view projection', () => {
      const orientation:BodyPartTransform = {
        horizontalX:0, horizontalY:-1, verticalX:-1, verticalY:0, translateX:0, translateY:0
      };
      const view:BodyPartTransform = {
        horizontalX:2, horizontalY:0, verticalX:0, verticalY:3, translateX:100, translateY:200
      };
      const projected = Object.freeze(composeBodyTransforms(view, orientation));
      const result = createCanvasAttachmentTransform(projected, { scaleX:2, scaleY:3 });
      const expected = transformBodyPoint(projected, [5, 7]);
      expect(transformBodyPoint(result, [10, 21])).toEqual(expected);
      expect(transformBodyPoint(result, [0, 0])).toEqual([100, 200]);
    });

    it('does not apply zoom twice to already-sized artwork', () => {
      const transform:BodyPartTransform = {
        horizontalX:0, horizontalY:3, verticalX:-2, verticalY:0, translateX:100, translateY:200
      };
      const zoomed:BodyPartTransform = {
        horizontalX:0, horizontalY:6, verticalX:-4, verticalY:0, translateX:200, translateY:400
      };
      const original = transformBodyPoint(createCanvasAttachmentTransform(transform, { scaleX:2, scaleY:3 }), [10, 21]);
      const result = transformBodyPoint(createCanvasAttachmentTransform(zoomed, { scaleX:4, scaleY:6 }), [20, 42]);
      expect(result).toEqual([original[0] * 2, original[1] * 2]);
    });
  });

  describe('applyBodyTransformDeltas()', () => {
    it('preserves the base transform for zero deltas', () => {
      const base = createBodyAttachmentTransform([13, 29], [2, 3], Math.PI / 3);
      expect(applyBodyTransformDeltas(base, [2, 3], 0, [0, 0])).toEqual(base);
    });

    it('rotates around the translated pivot without rotating or scaling the output-space displacement', () => {
      const base:BodyPartTransform = {
        horizontalX:0, horizontalY:-2, verticalX:-3, verticalY:0, translateX:100, translateY:200
      };
      const before = { ...base };
      const originalPivot = transformBodyPoint(base, [2, 3]);
      const result = applyBodyTransformDeltas(base, [2, 3], Math.PI / 2, [7, -11]);
      const pivot = transformBodyPoint(result, [2, 3]);
      const tip = transformBodyPoint(result, [4, 3]);
      expect(pivot[0]).toBeCloseTo(originalPivot[0] + 7);
      expect(pivot[1]).toBeCloseTo(originalPivot[1] - 11);
      expect(tip[0]).toBeCloseTo(pivot[0] - 6);
      expect(tip[1]).toBeCloseTo(pivot[1]);
      expect(base).toEqual(before);
    });

    it('keeps the same output displacement at different local rotation angles', () => {
      const base = createBodyAttachmentTransform([13, 29], [2, 3], Math.PI / 3);
      for (const angle of [0, Math.PI / 4, -Math.PI / 2]) {
        const rotated = applyBodyTransformDeltas(base, [2, 3], angle, [0, 0]);
        const translated = applyBodyTransformDeltas(base, [2, 3], angle, [7, -11]);
        for (const point of [[2, 3], [4, 6]] as const) {
          const original = transformBodyPoint(rotated, point);
          const result = transformBodyPoint(translated, point);
          expect(result[0] - original[0]).toBeCloseTo(7);
          expect(result[1] - original[1]).toBeCloseTo(-11);
        }
      }
    });
  });

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