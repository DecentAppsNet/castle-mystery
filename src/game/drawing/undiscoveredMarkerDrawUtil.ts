/* This module groups shared question-mark marker drawing for undiscovered room contents.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import ScalingFactors from "@/game/types/ScalingFactors";

import { COLOR_BLACK } from "./drawColorConstants";

export const UNDISCOVERED_MARKER_COLOR_CYCLE_MSECS = 1000;

const UNDISCOVERED_MARKER_TEXT = "?";
const UNDISCOVERED_MARKER_WORLD_WIDTH = 2;
const UNDISCOVERED_MARKER_WORLD_HEIGHT = 2;
const UNDISCOVERED_MARKER_BOB_SCALE = 0.22;
const UNDISCOVERED_MARKER_COLORS = ["#ffd40080", "#ff3b3080", "#34c75980", "#007aff80", "#ff950080", "#af52de80"] as const;

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

export function calcUndiscoveredMarkerHeightPixels(scalingFactors:ScalingFactors):number {
  return _calcMarkerBoxPixels(scalingFactors).heightPixels;
}

function _calcMarkerBobOffsetPixels(time:number, randomSalt:number, markerHeightPixels:number):number {
  const phase = ((time + _normalizeSaltPhase(randomSalt) * UNDISCOVERED_MARKER_COLOR_CYCLE_MSECS) % UNDISCOVERED_MARKER_COLOR_CYCLE_MSECS) / UNDISCOVERED_MARKER_COLOR_CYCLE_MSECS;
  return Math.sin(phase * Math.PI * 2) * markerHeightPixels * UNDISCOVERED_MARKER_BOB_SCALE;
}

function _findMarkerFillColor(metaTime:number):string {
  const colorIndex = Math.floor(Math.max(0, metaTime) / UNDISCOVERED_MARKER_COLOR_CYCLE_MSECS) % UNDISCOVERED_MARKER_COLORS.length;
  return UNDISCOVERED_MARKER_COLORS[colorIndex];
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

export function drawUndiscoveredMarker(centerX:number, centerY:number, randomSalt:number,
  scalingFactors:ScalingFactors, context:CanvasRenderingContext2D, metaTime:number) {
  const { widthPixels, heightPixels } = _calcMarkerBoxPixels(scalingFactors);
  const bobOffsetPixels = _calcMarkerBobOffsetPixels(metaTime, randomSalt, heightPixels);
  const baseFontSize = Math.max(1, heightPixels);

  context.save();
  context.font = `700 ${baseFontSize}px serif`;
  context.textAlign = "center";
  context.textBaseline = "bottom";
  context.lineJoin = "round";
  const { scaleX, scaleY } = _calcMarkerScale(context, widthPixels, heightPixels, baseFontSize);
  context.lineWidth = Math.max(1.5, scalingFactors.roomLineWidth * 0.2) / Math.max(scaleX, scaleY, 1);
  context.strokeStyle = COLOR_BLACK;
  context.fillStyle = _findMarkerFillColor(metaTime);
  const markerY = centerY - bobOffsetPixels;
  context.translate(centerX, markerY);
  context.scale(scaleX, scaleY);
  context.strokeText(UNDISCOVERED_MARKER_TEXT, 0, 0);
  context.fillText(UNDISCOVERED_MARKER_TEXT, 0, 0);
  context.restore();
}