/* This module groups shared question-mark marker drawing for undiscovered room contents.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import ScalingFactors from "@/game/types/ScalingFactors";

import { COLOR_BLACK } from "./drawColorConstants";

export const UNDISCOVERED_MARKER_CYCLE_MSECS = 3000;

const UNDISCOVERED_MARKER_TEXT = "?";
const UNDISCOVERED_MARKER_WORLD_WIDTH = 2;
const UNDISCOVERED_MARKER_WORLD_HEIGHT = 2;
const UNDISCOVERED_MARKER_GAP_SCALE = 0.15;
const UNDISCOVERED_MARKER_BOB_SCALE = 0.22;

function _normalizeSaltPhase(randomSalt:number):number {
  const saltFloor = Math.floor(randomSalt);
  const normalizedSalt = randomSalt - saltFloor;
  return normalizedSalt < 0 ? normalizedSalt + 1 : normalizedSalt;
}

function _calcMarkerBoxPixels(scalingFactors:ScalingFactors):{ widthPixels:number, heightPixels:number } {
  return {
    widthPixels:scalingFactors.scaleX * UNDISCOVERED_MARKER_WORLD_WIDTH,
    heightPixels:scalingFactors.scaleY * UNDISCOVERED_MARKER_WORLD_HEIGHT
  };
}

function _calcMarkerBobOffsetPixels(time:number, randomSalt:number, markerHeightPixels:number):number {
  const phase = ((time + _normalizeSaltPhase(randomSalt) * UNDISCOVERED_MARKER_CYCLE_MSECS) % UNDISCOVERED_MARKER_CYCLE_MSECS) / UNDISCOVERED_MARKER_CYCLE_MSECS;
  return (Math.sin(phase * Math.PI * 2) * 0.5 + 0.5) * markerHeightPixels * UNDISCOVERED_MARKER_BOB_SCALE;
}

function _calcMarkerScale(context:CanvasRenderingContext2D, markerWidthPixels:number, markerHeightPixels:number,
  baseFontSize:number):{ scaleX:number, scaleY:number } {
  const metrics = context.measureText(UNDISCOVERED_MARKER_TEXT);
  const measuredWidth = Math.max(1, metrics.width);
  const measuredHeight = Math.max(1, metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent || baseFontSize);
  return {
    scaleX:markerWidthPixels / measuredWidth,
    scaleY:markerHeightPixels / measuredHeight
  };
}

export function drawUndiscoveredMarker(centerX:number, topY:number, randomSalt:number,
  scalingFactors:ScalingFactors, context:CanvasRenderingContext2D, time:number) {
  const { widthPixels, heightPixels } = _calcMarkerBoxPixels(scalingFactors);
  const gapPixels = heightPixels * UNDISCOVERED_MARKER_GAP_SCALE;
  const bobOffsetPixels = _calcMarkerBobOffsetPixels(time, randomSalt, heightPixels);
  const baseFontSize = Math.max(1, heightPixels);

  context.save();
  context.font = `700 ${baseFontSize}px serif`;
  context.textAlign = "center";
  context.textBaseline = "bottom";
  context.lineJoin = "round";
  const { scaleX, scaleY } = _calcMarkerScale(context, widthPixels, heightPixels, baseFontSize);
  context.lineWidth = Math.max(1.5, scalingFactors.roomLineWidth * 0.2) / Math.max(scaleX, scaleY, 1);
  context.strokeStyle = COLOR_BLACK;
  context.fillStyle = "#fff";
  const markerY = topY - gapPixels - bobOffsetPixels;
  context.translate(centerX, markerY);
  context.scale(scaleX, scaleY);
  context.strokeText(UNDISCOVERED_MARKER_TEXT, 0, 0);
  context.fillText(UNDISCOVERED_MARKER_TEXT, 0, 0);
  context.restore();
}