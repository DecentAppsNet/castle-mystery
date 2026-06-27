/* This module groups developer-only frame-rate measurement and drawing helpers for an on-canvas FPS counter.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

const FPS_SAMPLE_COUNT = 30;
const FPS_FONT_SIZE = 12;
const FPS_PADDING = 8;
const FPS_TEXT = '0 fps';

let _lastFrameMetaTime:number|undefined;
let _frameDurations:number[] = [];
let _frameDurationSum = 0;

function _addFrameDuration(frameDuration:number) {
  _frameDurations.push(frameDuration);
  _frameDurationSum += frameDuration;
  if (_frameDurations.length <= FPS_SAMPLE_COUNT) return;
  const removedDuration = _frameDurations.shift();
  if (removedDuration !== undefined) _frameDurationSum -= removedDuration;
}

function _findAverageFrameDuration():number|null {
  if (_frameDurations.length === 0 || _frameDurationSum <= 0) return null;
  return _frameDurationSum / _frameDurations.length;
}

function _findFpsText():string {
  const averageFrameDuration = _findAverageFrameDuration();
  if (!averageFrameDuration) return FPS_TEXT;
  return `${Math.round(1000 / averageFrameDuration)} fps`;
}

function _updateFps(frameMetaTime:number) {
  if (_lastFrameMetaTime === undefined) {
    _lastFrameMetaTime = frameMetaTime;
    return;
  }

  const frameDuration = frameMetaTime - _lastFrameMetaTime;
  _lastFrameMetaTime = frameMetaTime;
  if (frameDuration <= 0) return;
  _addFrameDuration(frameDuration);
}

function _drawFps(context:CanvasRenderingContext2D) {
  const text = _findFpsText();

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

export function updateAndDrawFps(frameMetaTime:number, context:CanvasRenderingContext2D) {
  _updateFps(frameMetaTime);
  _drawFps(context);
}