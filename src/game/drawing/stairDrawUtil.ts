/* This module groups staircase line drawing helpers for room rendering. */

import { assert } from "decent-portal";

import { COLOR_BLACK } from "./drawConstants";
import { gameToCanvasPosition } from "./drawUtil";
import Position from "../types/Position";
import ScalingFactors from "../types/ScalingFactors";

const PREFERRED_STEP_RISE_RUN = 1;
const STAIRS_LINE_WIDTH_MULTIPLIER = 0.2;

function _calcStairStepCount(totalRiseRun:number):number {
  return Math.max(1, Math.round(totalRiseRun / PREFERRED_STEP_RISE_RUN));
}

export function drawStairs(fromPosition:Position, toPosition:Position, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const totalRise = toPosition.y - fromPosition.y;
  const totalRun = toPosition.x - fromPosition.x;
  assert(Math.abs(totalRise) === Math.abs(totalRun), 'stairs must be drawn at a 45 degree angle');

  const stepCount = _calcStairStepCount(Math.abs(totalRise));
  const stepRise = totalRise / stepCount;
  const stepRun = totalRun / stepCount;
  context.strokeStyle = COLOR_BLACK;
  context.lineWidth = Math.max(1, scalingFactors.roomLineWidth * STAIRS_LINE_WIDTH_MULTIPLIER);
  context.beginPath();
  context.moveTo(...gameToCanvasPosition(fromPosition.x, fromPosition.y, scalingFactors));

  let currentX = fromPosition.x;
  let currentY = fromPosition.y;
  for (let i = 0; i < stepCount; i++) {
    currentX += stepRun;
    context.lineTo(...gameToCanvasPosition(currentX, currentY, scalingFactors));
    currentY += stepRise;
    context.lineTo(...gameToCanvasPosition(currentX, currentY, scalingFactors));
  }
  context.stroke();
}