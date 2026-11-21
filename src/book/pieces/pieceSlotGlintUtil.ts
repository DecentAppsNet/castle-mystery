/* This file calculates the glint's nearest forward intersection with a piece-slot polygon.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assert } from 'decent-portal';
import Point from '@/game/types/Point';

const INTERSECTION_EPSILON = 1e-10;

export function calcPieceSlotGlintPoint(center:Point, polygon:readonly Point[], angle:number):Point {
  // Use mathematical angles in canvas coordinates, independently of drawing transforms.
  assert(Number.isFinite(angle) && polygon.length >= 3);
  const dx = Math.cos(angle), dy = -Math.sin(angle);
  let nearest = Infinity;

  // Find the nearest forward ray intersection, including shared polygon vertices.
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length];
    const ex = b[0] - a[0], ey = b[1] - a[1];
    const denominator = dx * ey - dy * ex;
    if (Math.abs(denominator) < INTERSECTION_EPSILON) continue;
    const ax = a[0] - center[0], ay = a[1] - center[1];
    const distance = (ax * ey - ay * ex) / denominator;
    const fraction = (ax * dy - ay * dx) / denominator;
    if (distance >= 0 && fraction >= -INTERSECTION_EPSILON && fraction <= 1 + INTERSECTION_EPSILON) {
      nearest = Math.min(nearest, distance);
    }
  }

  // Slot centers must lie inside their nondegenerate border polygon.
  assert(Number.isFinite(nearest));
  return [center[0] + dx * nearest, center[1] + dy * nearest];
}