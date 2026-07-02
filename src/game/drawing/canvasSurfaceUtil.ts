/* This module groups scratch-canvas creation helpers used by cached drawing surfaces and other offscreen rendering.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { assert } from "decent-portal";

export function createScratchCanvas(width:number, height:number):HTMLCanvasElement|OffscreenCanvas|null {
  assert(Number.isFinite(width) && width > 0);
  assert(Number.isFinite(height) && height > 0);
  const resolvedWidth = Math.round(width);
  const resolvedHeight = Math.round(height);
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(resolvedWidth, resolvedHeight);
  const canvas = document.createElement('canvas');
  canvas.width = resolvedWidth;
  canvas.height = resolvedHeight;
  return canvas;
}

export function getScratchCanvasContext2d(canvas:HTMLCanvasElement|OffscreenCanvas,
  willReadFrequently:boolean = false):CanvasRenderingContext2D|OffscreenCanvasRenderingContext2D|null {
  return canvas.getContext('2d', willReadFrequently ? { willReadFrequently:true } : undefined);
}