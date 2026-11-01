import { describe, expect, it } from 'vitest';
import { createBodyPose, createRasterCharacterBody, getBodyBounds, getResolvedBodyPart, transformBodyPoint } from '../index';
import { resolveBodyHierarchy } from '../characterBodyPoseUtil';
import RasterBodyDefinition from '../types/RasterBodyDefinition';
import rasterBody from './fixtures/rasterBody';

type RasterPartKind = keyof RasterBodyDefinition['parts'];
type RasterConnectionKind = Exclude<RasterPartKind, 'torso'>;

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
        expect(['nearHand', 'farHand']).not.toContain(part.kind);
        const source = rasterBody.parts[part.kind as RasterPartKind];
        expect(part.width).toBe(source.width * 2);
        expect(part.height).toBe(source.height * 2);
        expect(part.pivotPoint).toEqual(source.pivotPoint.map(value => value * 2));
        expect(part.imageUrl).toBe(source.imageUrl);
        const isArm = part.kind === 'farArm' || part.kind === 'nearArm';
        // The provisional hand convention is 75% across the arm at its bottom edge, then scaled.
        expect(part.handPoint).toEqual(isArm ? [source.width * 0.75 * 2, source.height * 2] : null);
      }
      for (const { part, connectionPoint } of root.connectedParts) {
        expect(['torso', 'nearHand', 'farHand']).not.toContain(part.kind);
        expect(connectionPoint).toEqual(rasterBody.connections[part.kind as RasterConnectionKind].map(value => value * 2));
      }
    });

    it('scales supplied hand connections without mutating or sharing source coordinates', () => {
      const definition:RasterBodyDefinition = { ...rasterBody, connections:{ ...rasterBody.connections,
        nearHand:[63, 176], farHand:[40, 165] } };
      const before = structuredClone(definition);
      const root = createRasterCharacterBody(definition, 460);
      const parts = resolveBodyHierarchy(root, IDENTITY);
      const nearHand = getResolvedBodyPart(parts, 'nearArm').part.handPoint;
      const farHand = getResolvedBodyPart(parts, 'farArm').part.handPoint;
      expect(nearHand).toEqual([126, 352]);
      expect(farHand).toEqual([80, 330]);
      expect(nearHand).not.toBe(definition.connections.nearHand);
      expect(farHand).not.toBe(definition.connections.farHand);
      expect(definition).toEqual(before);
    });

    it('connects scaled attachment-only hands to their corresponding arms', () => {
      const definition:RasterBodyDefinition = { ...rasterBody, connections:{ ...rasterBody.connections,
        nearHand:[63, 176], farHand:[40, 165] } };
      const before = structuredClone(definition);
      const root = createRasterCharacterBody(definition, 460);
      const parts = resolveBodyHierarchy(root, IDENTITY);
      const nearArm = getResolvedBodyPart(parts, 'nearArm');
      const farArm = getResolvedBodyPart(parts, 'farArm');
      expect(nearArm.part.connectedParts).toEqual([{ connectionPoint:[126, 352], part:{
        kind:'nearHand', imageUrl:null, width:0, height:0, pivotPoint:[0, 0], connectedParts:[], handPoint:null } }]);
      expect(farArm.part.connectedParts[0].part.kind).toBe('farHand');
      expect(farArm.part.connectedParts[0].connectionPoint).toEqual([80, 330]);
      const nearHand = getResolvedBodyPart(parts, 'nearHand');
      expect(transformBodyPoint(nearHand.transform, [0, 0]))
        .toEqual(transformBodyPoint(nearArm.transform, [126, 352]));
      expect(definition).toEqual(before);
      expect(nearArm.part.connectedParts[0].connectionPoint).not.toBe(definition.connections.nearHand);
    });

    it('excludes distant hand attachments from physical bounds and source-height scaling', () => {
      const definition:RasterBodyDefinition = { ...rasterBody, connections:{ ...rasterBody.connections,
        nearHand:[10000, 20000], farHand:[-10000, -20000] } };
      const original = createRasterCharacterBody(rasterBody, 460);
      const root = createRasterCharacterBody(definition, 460);
      expect(root.width).toBe(original.width);
      expect(getBodyBounds(resolveBodyHierarchy(root, IDENTITY)))
        .toEqual(getBodyBounds(resolveBodyHierarchy(original, IDENTITY)));
    });

    it('does not let distant hand attachments change posture grounding', () => {
      const definition:RasterBodyDefinition = { ...rasterBody, connections:{ ...rasterBody.connections,
        nearHand:[10000, 20000], farHand:[-10000, -20000] } };
      const original = createRasterCharacterBody(rasterBody);
      const root = createRasterCharacterBody(definition);
      for (const orientation of ['standing', 'sitting', 'kneeling', 'laying'] as const) {
        for (const facing of ['left', 'right'] as const) {
          const normal = createBodyPose(original, orientation, facing);
          const distant = createBodyPose(root, orientation, facing);
          expect(getResolvedBodyPart(distant, 'torso').transform).toEqual(getResolvedBodyPart(normal, 'torso').transform);
          expect(getBodyBounds(distant)).toEqual(getBodyBounds(normal));
        }
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
        expect(['torso', 'nearHand', 'farHand']).not.toContain(part.kind);
        expect(part.pivotPoint).not.toBe(rasterBody.parts[part.kind as RasterPartKind].pivotPoint);
        expect(connectionPoint).not.toBe(rasterBody.connections[part.kind as RasterConnectionKind]);
      }
    });
  });
});