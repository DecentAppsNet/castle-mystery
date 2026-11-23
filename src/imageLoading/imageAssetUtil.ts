/* This file creates runtime image assets with precomputed visible pixel bounds.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { createScratchCanvas, getScratchCanvasContext2d } from '@/game/drawing/canvasSurfaceUtil';
import { findVisibleImageSourceRect } from './imageBoundsUtil';
import ImageAsset from './types/ImageAsset';

export function createImageAsset(image:ImageBitmap, punchMaskImage:ImageBitmap|null = null):ImageAsset {
  // Readback must succeed before the asset can be considered complete.
  const canvas = createScratchCanvas(image.width, image.height);
  const context = getScratchCanvasContext2d(canvas, true);

  // Analyze original pixels without retaining the temporary surface or pixel buffer.
  context.drawImage(image, 0, 0);
  const { data } = context.getImageData(0, 0, image.width, image.height);
  const visibleSourceRect = findVisibleImageSourceRect(data, image.width, image.height);
  return { image, punchMaskImage, visibleSourceRect };
}