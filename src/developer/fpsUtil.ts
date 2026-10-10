/* This module groups developer-only frame-rate measurement and drawing helpers for an on-canvas FPS counter.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { createMovingAverage, updateMovingAverage } from "@/common/movingAverage";

const FPS_SAMPLE_COUNT = 30;
const FPS_FONT_SIZE = 12;
const FPS_PADDING = 8;

let theLastFrameMetaTime:number|undefined;
const theFrameDurationMovingAverage = createMovingAverage(FPS_SAMPLE_COUNT);
const theVirtualFrameDurationMovingAverage = createMovingAverage(FPS_SAMPLE_COUNT);

function _drawText(text:string, context:CanvasRenderingContext2D) {
  context.font = `${FPS_FONT_SIZE}px monospace`;
  context.textAlign = 'right';
  context.textBaseline = 'top';
  context.lineWidth = 3;
  context.strokeStyle = '#000';
  context.fillStyle = '#fff';
  context.strokeText(text, context.canvas.width - FPS_PADDING, FPS_PADDING);
  context.fillText(text, context.canvas.width - FPS_PADDING, FPS_PADDING);
}

function _durationToFps(frameDuration:number):number {
  return Math.round(1000 / frameDuration)
}

function _calcFps(frameStartMetaTime:number):number {
  if (theLastFrameMetaTime === undefined) {
    theLastFrameMetaTime = frameStartMetaTime;
    return 0;
  }
  const averageFrameDuration = updateMovingAverage(frameStartMetaTime - theLastFrameMetaTime, theFrameDurationMovingAverage);
  theLastFrameMetaTime = frameStartMetaTime;
  return _durationToFps(averageFrameDuration);
}

function _calcVfps(frameStartMetaTime:number, frameEndMetaTime:number):number {
  const averageVirtualFrameDuration = updateMovingAverage(frameEndMetaTime - frameStartMetaTime, theVirtualFrameDurationMovingAverage);
  return _durationToFps(averageVirtualFrameDuration);
}

export function updateAndDrawFps(frameStartMetaTime:number, frameEndMetaTime:number, context:CanvasRenderingContext2D) {
  const fps = _calcFps(frameStartMetaTime);
  const vfps = _calcVfps(frameStartMetaTime, frameEndMetaTime);
  const text = `${fps} fps / ${vfps} vfps`;
  _drawText(text, context);
}