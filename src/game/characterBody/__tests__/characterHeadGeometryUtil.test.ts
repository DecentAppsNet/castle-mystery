import { describe, expect, it } from 'vitest';
import { createBodyCanvasLayout, createBodyPose, createDefaultCharacterBody, fitHeadImage,
  calcHeadImageBounds, getResolvedBodyPart, transformBodyPoint } from '../index';

describe('characterHeadGeometryUtil', () => {
  describe('fitHeadImage()', () => {
    it('fits a portrait image without stretching or cropping', () => {
      const head = { width:8, height:6 };
      const fit = fitHeadImage(head, 100, 200)!;
      expect(fit.width / fit.height).toBeCloseTo(100 / 200);
      expect(fit.width).toBeCloseTo(head.width);
      expect(fit.x + fit.width / 2).toBeCloseTo(head.width / 2);
      expect(fit.y + fit.height / 2).toBeCloseTo(head.height / 2);
    });

    it('fits a landscape image without stretching or cropping', () => {
      const head = { width:8, height:6 };
      const fit = fitHeadImage(head, 200, 100)!;
      expect(fit.width / fit.height).toBeCloseTo(200 / 100);
      expect(fit.width).toBeCloseTo(head.width);
      expect(fit.x + fit.width / 2).toBeCloseTo(head.width / 2);
      expect(fit.y + fit.height / 2).toBeCloseTo(head.height / 2);
    });

    it('uses the full logical head envelope for a matching image aspect ratio', () => {
      const root = createDefaultCharacterBody();
      const head = root.connectedParts.find(connection => connection.part.kind === 'head')!.part;
      expect(fitHeadImage(head, 120, 120)).toEqual({ x:0, y:0, width:head.width, height:head.height });
    });

    it('selects fallback for zero image dimensions', () => {
      expect(fitHeadImage({ width:8, height:6 }, 0, 200)).toBeNull();
      expect(fitHeadImage({ width:8, height:6 }, 100, 0)).toBeNull();
    });
  });

  describe('calcHeadImageBounds()', () => {
    it('contains every fitted corner for upright and laying heads in both facings', () => {
      const root = createDefaultCharacterBody();
      const original = structuredClone(root);
      for (const orientation of ['standing', 'laying'] as const) {
        for (const facing of ['left', 'right'] as const) {
          const layout = createBodyCanvasLayout(createBodyPose(root, orientation, facing),
            [137, 251], { scaleX:3, scaleY:5 });
          const head = getResolvedBodyPart(layout.parts, 'head');
          expect(head.part.pivotPoint[1]).not.toBe(head.part.height / 2);
          for (const [imageWidth, imageHeight] of [[100, 200], [200, 100]]) {
            const fit = fitHeadImage(head.part, imageWidth, imageHeight)!;
            const bounds = calcHeadImageBounds(head, imageWidth, imageHeight)!;
            for (const point of [[fit.x, fit.y], [fit.x + fit.width, fit.y],
              [fit.x, fit.y + fit.height], [fit.x + fit.width, fit.y + fit.height]] as const) {
              const [canvasX, canvasY] = transformBodyPoint(head.transform, point);
              expect(canvasX).toBeGreaterThanOrEqual(bounds.x - 1e-10);
              expect(canvasX).toBeLessThanOrEqual(bounds.x + bounds.width + 1e-10);
              expect(canvasY).toBeGreaterThanOrEqual(bounds.y - 1e-10);
              expect(canvasY).toBeLessThanOrEqual(bounds.y + bounds.height + 1e-10);
            }
            expect(bounds.width * bounds.height).toBeGreaterThan(0);
          }
        }
      }
      expect(root).toEqual(original);
    });

    it('selects fallback bounds for an unusable image', () => {
      const head = getResolvedBodyPart(createBodyPose(createDefaultCharacterBody(), 'standing', 'right'), 'head');
      expect(calcHeadImageBounds(head, 0, 120)).toBeNull();
    });
  });
});