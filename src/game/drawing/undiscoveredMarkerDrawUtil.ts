/* This module groups shared question-mark marker drawing for undiscovered room contents.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import ScalingFactors from "@/game/types/ScalingFactors";

import { COLOR_BLACK } from "./drawColorConstants";

export const UNDISCOVERED_MARKER_CYCLE_MSECS = 3000;

const UNDISCOVERED_MARKER_FONT_SCALE = 1.2;
const UNDISCOVERED_MARKER_MIN_FONT_SIZE = 12;
const UNDISCOVERED_MARKER_GAP_SCALE = 0.15;
const UNDISCOVERED_MARKER_BOB_SCALE = 0.22;

function _normalizeSaltPhase(randomSalt:number):number {
  const saltFloor = Math.floor(randomSalt);
  const normalizedSalt = randomSalt - saltFloor;
  return normalizedSalt < 0 ? normalizedSalt + 1 : normalizedSalt;
}

function _calcMarkerFontSize(scalingFactors:ScalingFactors):number {
  return Math.max(UNDISCOVERED_MARKER_MIN_FONT_SIZE, scalingFactors.roomFontHeight * UNDISCOVERED_MARKER_FONT_SCALE);
}

function _calcMarkerBobOffsetPixels(time:number, randomSalt:number, fontSize:number):number {
  const phase = ((time + _normalizeSaltPhase(randomSalt) * UNDISCOVERED_MARKER_CYCLE_MSECS) % UNDISCOVERED_MARKER_CYCLE_MSECS) / UNDISCOVERED_MARKER_CYCLE_MSECS;
  return (Math.sin(phase * Math.PI * 2) * 0.5 + 0.5) * fontSize * UNDISCOVERED_MARKER_BOB_SCALE;
}

export function drawUndiscoveredMarker(centerX:number, topY:number, randomSalt:number,
  scalingFactors:ScalingFactors, context:CanvasRenderingContext2D, time:number) {
  const fontSize = _calcMarkerFontSize(scalingFactors);
  const gapPixels = fontSize * UNDISCOVERED_MARKER_GAP_SCALE;
  const bobOffsetPixels = _calcMarkerBobOffsetPixels(time, randomSalt, fontSize);

  context.save();
  context.font = `700 ${fontSize}px serif`;
  context.textAlign = "center";
  context.textBaseline = "bottom";
  context.lineJoin = "round";
  context.lineWidth = Math.max(1.5, scalingFactors.roomLineWidth * 0.2);
  context.strokeStyle = COLOR_BLACK;
  context.fillStyle = "#fff";
  const markerY = topY - gapPixels - bobOffsetPixels;
  context.strokeText("?", centerX, markerY);
  context.fillText("?", centerX, markerY);
  context.restore();
}