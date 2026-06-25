/* This module groups scratch-canvas creation helpers used by cached drawing surfaces and other offscreen rendering.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

export function createScratchCanvas(width:number, height:number):HTMLCanvasElement|OffscreenCanvas|null {
  if (width <= 0 || height <= 0) return null;
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height);
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}