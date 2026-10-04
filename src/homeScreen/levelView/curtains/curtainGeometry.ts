/* This file calculates curtain edge geometry and scales its design coordinates to the destination canvas.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import type CurtainEdgePoint from './types/CurtainEdgePoint';
import type CurtainSide from './types/CurtainSide';

/** Width of the curtain's design coordinate system. */
export const CURTAIN_DESIGN_WIDTH = 960;
/** Height of the curtain's design coordinate system. */
export const CURTAIN_DESIGN_HEIGHT = 540;
const EDGE_HEIGHT_FRACTIONS = [0, 0.13, 0.27, 0.42, 0.58, 0.74, 0.89, 1] as const;

/** Calculates folded inner-edge points with bottom-weighted settling and independent width/height scaling. */
export function calculateCurtainEdgePoints(side:CurtainSide, amount:number, settlingDisplacement:number,
  destWidth:number = CURTAIN_DESIGN_WIDTH, destHeight:number = CURTAIN_DESIGN_HEIGHT):ReadonlyArray<CurtainEdgePoint> {
  // Locate the inner edge in design coordinates, retaining closed center overlap.
  const isLeft = side === 'left';
  const openX = isLeft ? -28 : CURTAIN_DESIGN_WIDTH + 28;
  const closedX = CURTAIN_DESIGN_WIDTH / 2 + (isLeft ? 34 : -34);
  const baseX = openX + (closedX - openX) * amount;
  const outwardDirection = isLeft ? -1 : 1;

  // Scale all perturbations with the canvas rather than preserving the design aspect ratio.
  return EDGE_HEIGHT_FRACTIONS.map((heightFraction, pointI) => {
    const envelope = Math.sin(heightFraction * Math.PI);
    const fold = Math.sin(pointI * 1.85 + (isLeft ? 0 : 0.7)) * 18 * envelope;
    const pull = (1 - amount) * envelope * 34;
    const settling = settlingDisplacement * heightFraction * heightFraction;
    return {
      x:(baseX + outwardDirection * (fold * amount + pull - settling)) * destWidth / CURTAIN_DESIGN_WIDTH,
      y:heightFraction * destHeight
    };
  });
}