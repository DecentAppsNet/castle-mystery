/* This file paints curtain halves with folded red fabric and outlined inner edges over the level-view canvas.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */
/* v8 ignore file -- Canvas painting is verified visually rather than through drawing-call tests. @preserve */

import {
  calculateCurtainEdgePoints, CURTAIN_DESIGN_HEIGHT, CURTAIN_DESIGN_WIDTH, type CurtainSide
} from './curtainGeometry';
import { createCurtainPaths } from './curtainPathUtil';

function _drawFolds(context:CanvasRenderingContext2D, side:CurtainSide) {
  const direction = side === 'left' ? 1 : -1;
  const outerX = side === 'left' ? 0 : CURTAIN_DESIGN_WIDTH;
  context.globalAlpha = 0.22;
  context.lineWidth = 18;

  // Broad alternating folds remain clipped to their curtain half by the caller.
  for (let foldI = 0; foldI < 7; ++foldI) {
    const foldX = outerX + direction * (35 + foldI * 72);
    const foldPath = new Path2D();
    foldPath.moveTo(foldX, 0);
    foldPath.bezierCurveTo(foldX + 15 * direction, CURTAIN_DESIGN_HEIGHT * 0.3,
      foldX - 10 * direction, CURTAIN_DESIGN_HEIGHT * 0.68, foldX, CURTAIN_DESIGN_HEIGHT);
    context.strokeStyle = foldI % 2 ? '#f1a072' : '#160403';
    context.stroke(foldPath);
  }
}

function _drawHalfCurtain(context:CanvasRenderingContext2D, side:CurtainSide,
  amount:number, settlingDisplacement:number) {
  // Use matching fill, clip, and stroke paths from the design-space edge geometry.
  const points = calculateCurtainEdgePoints(side, amount, settlingDisplacement);
  const { half, innerEdge } = createCurtainPaths(side, points, CURTAIN_DESIGN_WIDTH, CURTAIN_DESIGN_HEIGHT);
  const isLeft = side === 'left';
  const edgeX = points[Math.floor(points.length / 2)].x;
  const gradient = context.createLinearGradient(isLeft ? 0 : edgeX, 0,
    isLeft ? edgeX : CURTAIN_DESIGN_WIDTH, 0);
  gradient.addColorStop(0, '#4c0e0d');
  gradient.addColorStop(0.18, '#8c2420');
  gradient.addColorStop(0.38, '#52100f');
  gradient.addColorStop(0.58, '#a73229');
  gradient.addColorStop(0.78, '#591311');
  gradient.addColorStop(1, '#8d241f');
  context.fillStyle = gradient;
  context.fill(half);

  // Restore the unclipped, opaque context before outlining the inner edge.
  context.save();
  context.clip(half);
  _drawFolds(context, side);
  context.restore();
  context.strokeStyle = '#3a0908';
  context.lineWidth = 5;
  context.stroke(innerEdge);
}

/** Paints both curtain halves at current canvas dimensions, preserving context state and drawing nothing when fully open. */
export function drawCurtainHalves(context:CanvasRenderingContext2D, amount:number, settlingDisplacement:number) {
  const { width, height } = context.canvas;
  if (amount <= 0 || width <= 0 || height <= 0) return;

  // Scale the entire fabric treatment independently to the destination width and height.
  context.save();
  context.scale(width / CURTAIN_DESIGN_WIDTH, height / CURTAIN_DESIGN_HEIGHT);
  context.globalAlpha = 1;
  _drawHalfCurtain(context, 'left', amount, settlingDisplacement);
  _drawHalfCurtain(context, 'right', amount, settlingDisplacement);
  context.restore();
}