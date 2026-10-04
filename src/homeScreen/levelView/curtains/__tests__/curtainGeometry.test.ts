import { describe, expect, it } from 'vitest';

import { calculateCurtainEdgePoints } from '../curtainGeometry';
import { calculateCurtainFrame } from '../curtainTiming';

describe('curtainGeometry', () => {
  describe('calculateCurtainEdgePoints()', () => {
    it('places every fully open inner-edge point offscreen', () => {
      const left = calculateCurtainEdgePoints('left', 0, 0);
      const right = calculateCurtainEdgePoints('right', 0, 0);
      expect(Math.max(...left.map(point => point.x))).toBeLessThan(0);
      expect(Math.min(...right.map(point => point.x))).toBeGreaterThan(960);
    });

    it('preserves the eight prototype edge heights', () => {
      const points = calculateCurtainEdgePoints('left', 1, 0);
      expect(points.map(point => point.y)).toEqual([0, 70.2, 145.8, 226.79999999999998, 313.2, 399.6, 480.6, 540]);
    });

    it('reaches 34 design pixels past center on each closed half', () => {
      const left = calculateCurtainEdgePoints('left', 1, 0);
      const right = calculateCurtainEdgePoints('right', 1, 0);
      expect(left[0].x).toBe(514);
      expect(right[0].x).toBe(446);
      expect(left[7].x).toBeCloseTo(514);
      expect(right[7].x).toBeCloseTo(446);
      expect(Math.min(...left.map((point, pointI) => point.x - right[pointI].x))).toBeGreaterThan(0);
    });

    it('retains the prototype asymmetric fold shape during closing', () => {
      const left = calculateCurtainEdgePoints('left', 0.5, 0);
      const right = calculateCurtainEdgePoints('right', 0.5, 0);
      expect(left[1].x).toBeCloseTo(243 - (Math.sin(1.85) * 9 + 17) * Math.sin(0.13 * Math.PI));
      expect(right[1].x).toBeCloseTo(717 + (Math.sin(2.55) * 9 + 17) * Math.sin(0.13 * Math.PI));
    });

    it('weights settling quadratically toward the bottom in opposite directions', () => {
      const left = calculateCurtainEdgePoints('left', 1, 16);
      const right = calculateCurtainEdgePoints('right', 1, 16);
      const restingLeft = calculateCurtainEdgePoints('left', 1, 0);
      const restingRight = calculateCurtainEdgePoints('right', 1, 0);
      expect(left[0]).toEqual(restingLeft[0]);
      expect(left[4].x - restingLeft[4].x).toBeCloseTo(16 * 0.58 * 0.58);
      expect(left[7].x - restingLeft[7].x).toBeCloseTo(16);
      expect(right[7].x - restingRight[7].x).toBeCloseTo(-16);
    });

    it('keeps cubic endpoints and their control points overlapping at worst rebound', () => {
      const reboundMs = (Math.atan(18 / 8) + Math.PI) / 18 * 1000;
      const frame = calculateCurtainFrame({ phase:'closing', startedAt:0 }, 560 + reboundMs);
      const left = calculateCurtainEdgePoints('left', frame.curtainAmount, frame.settlingDisplacement);
      const right = calculateCurtainEdgePoints('right', frame.curtainAmount, frame.settlingDisplacement);
      expect(frame.settlingDisplacement).toBeLessThan(0);
      expect(Math.min(...left.map((point, pointI) => point.x - right[pointI].x))).toBeGreaterThan(0);
    });

    it('keeps overlap even under a conservative full-amplitude outward rebound', () => {
      const left = calculateCurtainEdgePoints('left', 1, -16);
      const right = calculateCurtainEdgePoints('right', 1, -16);
      expect(Math.min(...left.map((point, pointI) => point.x - right[pointI].x))).toBeGreaterThan(0);
    });

    it('scales width and height independently on a tall destination', () => {
      const design = calculateCurtainEdgePoints('left', 0.5, 4);
      const scaled = calculateCurtainEdgePoints('left', 0.5, 4, 480, 1080);
      expect(scaled).toEqual(design.map(point => ({ x:point.x / 2, y:point.y * 2 })));
    });

    it('covers the full height and preserves overlap on a wide destination', () => {
      const left = calculateCurtainEdgePoints('left', 1, -16, 1920, 270);
      const right = calculateCurtainEdgePoints('right', 1, -16, 1920, 270);
      expect(left[0].y).toBe(0);
      expect(left[7].y).toBe(270);
      expect(right[7].y).toBe(270);
      expect(Math.min(...left.map((point, pointI) => point.x - right[pointI].x))).toBeGreaterThan(0);
    });
  });
});