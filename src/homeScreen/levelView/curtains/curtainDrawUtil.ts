/* This file paints the level-view curtain overlay, including folded halves, valance, and loading status.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */
/* v8 ignore file -- Canvas painting is verified visually rather than through drawing-call tests. @preserve */

import {
  calculateCurtainEdgePoints, CURTAIN_DESIGN_HEIGHT, CURTAIN_DESIGN_WIDTH
} from './curtainGeometry';
import { createCurtainPaths } from './curtainPathUtil';
import type CurtainPresentation from './types/CurtainPresentation';
import type CurtainSide from './types/CurtainSide';

const VALANCE_HEIGHT = 78;

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
function _drawCurtainHalves(context:CanvasRenderingContext2D, amount:number, settlingDisplacement:number) {
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

function _drawValance(context:CanvasRenderingContext2D, amount:number) {
  if (amount <= 0) return;

  // Move the full scalloped height offscreen, scaling independently to current dimensions.
  context.save();
  context.scale(context.canvas.width / CURTAIN_DESIGN_WIDTH, context.canvas.height / CURTAIN_DESIGN_HEIGHT);
  context.translate(0, -VALANCE_HEIGHT * (1 - amount));
  context.fillStyle = '#671613';
  context.fillRect(0, 0, CURTAIN_DESIGN_WIDTH, 42);

  // Preserve the prototype's lowered band and semicircular scallops.
  context.fillStyle = '#9f3229';
  for (let scallopX = 0; scallopX < CURTAIN_DESIGN_WIDTH; scallopX += 80) {
    const scallop = new Path2D();
    scallop.arc(scallopX + 40, 38, 40, 0, Math.PI);
    context.fill(scallop);
  }
  context.restore();
}

function _drawLoadingLabel(context:CanvasRenderingContext2D, hasLoadingFailed:boolean) {
  const label = hasLoadingFailed ? 'Loading failed' : 'Loading\u2026';
  context.save();
  context.scale(context.canvas.width / CURTAIN_DESIGN_WIDTH, context.canvas.height / CURTAIN_DESIGN_HEIGHT);
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = 'bold 27px Jellee';
  context.lineWidth = 5;
  context.strokeStyle = 'rgba(45,8,6,.75)';

  // Outline before filling, keeping the status centered in the design coordinate system.
  context.strokeText(label, CURTAIN_DESIGN_WIDTH / 2, CURTAIN_DESIGN_HEIGHT / 2);
  context.fillStyle = '#f3d9a5';
  context.fillText(label, CURTAIN_DESIGN_WIDTH / 2, CURTAIN_DESIGN_HEIGHT / 2);
  context.restore();
}

/** Paints supplied curtain presentation values, showing loading status only while scene rendering is ineligible. */
export function drawCurtainOverlay(context:CanvasRenderingContext2D, frame:CurtainPresentation,
  hasLoadingFailed:boolean = false) {
  if (context.canvas.width <= 0 || context.canvas.height <= 0) return;

  // Keep presentation state isolated from the level scene and preserve the caller's current path.
  context.save();
  context.globalAlpha = 1;
  _drawCurtainHalves(context, frame.curtainAmount, frame.settlingDisplacement);
  if (!frame.canRenderScene) _drawLoadingLabel(context, hasLoadingFailed);
  _drawValance(context, frame.valanceAmount);
  context.restore();
}