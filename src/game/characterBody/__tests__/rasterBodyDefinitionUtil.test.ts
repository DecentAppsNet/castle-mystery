import { describe, expect, it } from 'vitest';
import { assert } from 'decent-portal';
import { createRasterCharacterBody, getBodyBounds, getResolvedBodyPart, resolveBodyHierarchy, transformBodyPoint } from '../index';
import rasterBody from './fixtures/rasterBody';

// Identity coefficients measure authored rectangles without posing, reflection, or translation.
const IDENTITY = { horizontalX:1, horizontalY:0, verticalX:0, verticalY:1, translateX:0, translateY:0 };

// The fixture spans Y = -50 through 180 (230 pixels); a target of 460 gives scale 2.
// These values depend on the fixture, not the production default height.
describe('rasterBodyDefinitionUtil', () => {
  describe('createRasterCharacterBody()', () => {
    it('uniformly scales every dimension, pivot, connection, and arm hand point', () => {
      const root = createRasterCharacterBody(rasterBody, 460);
      const parts = [root, ...root.connectedParts.map(({ part }) => part)];

      for (const part of parts) {
        const source = rasterBody.parts[part.kind];
        expect(part.width).toBe(source.width * 2);
        expect(part.height).toBe(source.height * 2);
        expect(part.pivotPoint).toEqual(source.pivotPoint.map(value => value * 2));
        expect(part.imageUrl).toBe(source.imageUrl);
        const isArm = part.kind === 'farArm' || part.kind === 'nearArm';
        // The provisional hand convention is 75% across the arm at its bottom edge, then scaled.
        expect(part.handPoint).toEqual(isArm ? [source.width * 0.75 * 2, source.height * 2] : null);
      }
      for (const { part, connectionPoint } of root.connectedParts) {
        expect(part.kind).not.toBe('torso');
        assert(part.kind !== 'torso');
        expect(connectionPoint).toEqual(rasterBody.connections[part.kind].map(value => value * 2));
      }
    });

    it('preserves pivot-to-connection alignment without reflecting authored connections', () => {
      const root = createRasterCharacterBody(rasterBody, 460);
      const parts = resolveBodyHierarchy(root, IDENTITY);
      for (const { part, connectionPoint } of root.connectedParts) {
        const resolved = getResolvedBodyPart(parts, part.kind);
        expect(transformBodyPoint(resolved.transform, part.pivotPoint)).toEqual(connectionPoint);
      }
    });

    it('measures full rectangles and scales their union to the supplied positive height', () => {
      // An arbitrary target checks the supplied-height contract independently of production tuning.
      const root = createRasterCharacterBody(rasterBody, 73);
      const bounds = getBodyBounds(resolveBodyHierarchy(root, IDENTITY));
      expect(Number.isFinite(bounds.height)).toBe(true);
      expect(bounds.height).toBeGreaterThan(0);
      expect(bounds.height).toBeCloseTo(73);
    });

    it('leaves source geometry unchanged and does not share coordinate arrays', () => {
      const before = structuredClone(rasterBody);
      const root = createRasterCharacterBody(rasterBody, 460);
      expect(rasterBody).toEqual(before);
      expect(root.pivotPoint).not.toBe(rasterBody.parts.torso.pivotPoint);
      for (const { part, connectionPoint } of root.connectedParts) {
        expect(part.pivotPoint).not.toBe(rasterBody.parts[part.kind].pivotPoint);
        assert(part.kind !== 'torso');
        expect(connectionPoint).not.toBe(rasterBody.connections[part.kind]);
      }
    });
  });
});