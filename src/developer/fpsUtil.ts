/* This module groups developer-only frame-rate measurement and drawing helpers for an on-canvas FPS counter.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { createMovingAverage, updateMovingAverage } from "@/common/movingAverage";

const FPS_SAMPLE_COUNT = 100;
const FPS_FONT_SIZE = 12;
const FPS_PADDING = 8;

let _lastFrameMetaTime:number|undefined;

const frameDurationMovingAverage = createMovingAverage(FPS_SAMPLE_COUNT);
const virtualFrameDurationMovingAverage = createMovingAverage(FPS_SAMPLE_COUNT);

function _drawText(text:string, context:CanvasRenderingContext2D) {
  context.save();
  context.font = `${FPS_FONT_SIZE}px monospace`;
  context.textAlign = 'right';
  context.textBaseline = 'top';
  context.lineWidth = 3;
  context.strokeStyle = '#000';
  context.fillStyle = '#fff';
  context.strokeText(text, context.canvas.width - FPS_PADDING, FPS_PADDING);
  context.fillText(text, context.canvas.width - FPS_PADDING, FPS_PADDING);
  context.restore();
}

export function updateAndDrawFps(frameStartMetaTime:number, frameEndMetaTime:number, context:CanvasRenderingContext2D) {
  if (_lastFrameMetaTime === undefined) {
    _lastFrameMetaTime = frameStartMetaTime;
    return;
  }
  const averageFrameDuration = updateMovingAverage(frameStartMetaTime - _lastFrameMetaTime, frameDurationMovingAverage);
  _lastFrameMetaTime = frameStartMetaTime;

  const averageVirtualFrameDuration = updateMovingAverage(frameEndMetaTime - frameStartMetaTime, virtualFrameDurationMovingAverage);
  
  const text = `${Math.round(1000 / averageFrameDuration)} fps / ${Math.round(1000 / averageVirtualFrameDuration)} vfps`;

  _drawText(text, context);
}