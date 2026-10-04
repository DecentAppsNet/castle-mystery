/* This file builds matching curtain half and inner-edge canvas paths from calculated geometry.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assertNonNullable } from 'decent-portal';

import type CurtainEdgePoint from './types/CurtainEdgePoint';
import type CurtainSide from './types/CurtainSide';

type CurtainPaths = Readonly<{ half:Path2D, innerEdge:Path2D }>;

/** Builds a closed half for fill/clip and an open inner edge for stroke, without changing canvas context state. */
export function createCurtainPaths(side:CurtainSide, points:ReadonlyArray<CurtainEdgePoint>,
  destWidth:number, destHeight:number):CurtainPaths {
  // Traverse the shared cubic edge once in destination coordinates.
  const firstPoint = points[0];
  assertNonNullable(firstPoint);
  const innerEdge = new Path2D();
  innerEdge.moveTo(firstPoint.x, firstPoint.y);
  for (let pointI = 1; pointI < points.length; ++pointI) {
    const previousPoint = points[pointI - 1];
    const point = points[pointI];
    const controlY = (previousPoint.y + point.y) / 2;
    innerEdge.bezierCurveTo(previousPoint.x, controlY, point.x, controlY, point.x, point.y);
  }

  // Copy the edge before closing the half along the outer canvas boundary.
  const half = new Path2D(innerEdge);
  const outerX = side === 'left' ? 0 : destWidth;
  half.lineTo(outerX, destHeight);
  half.lineTo(outerX, 0);
  half.closePath();
  return { half, innerEdge };
}