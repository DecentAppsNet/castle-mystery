/* This file calculates visible image bounds from RGBA pixel data.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import Rect from '@/game/types/Rect';
import { assert } from 'decent-portal';

const IMAGE_ALPHA_THRESHOLD = 16;

export function findVisibleImageSourceRect(data:Uint8ClampedArray, width:number, height:number,
    clipRect:Rect = { x:0, y:0, width, height }):Rect|null {
  assert(Number.isInteger(clipRect.x) && Number.isInteger(clipRect.y) &&
    Number.isInteger(clipRect.width) && Number.isInteger(clipRect.height));
  assert(clipRect.x >= 0 && clipRect.y >= 0 && clipRect.width >= 0 && clipRect.height >= 0 &&
    clipRect.x + clipRect.width <= width && clipRect.y + clipRect.height <= height);
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  // Include every pixel meeting the existing visibility threshold.
  for (let pixelY = clipRect.y; pixelY < clipRect.y + clipRect.height; ++pixelY) {
    for (let pixelX = clipRect.x; pixelX < clipRect.x + clipRect.width; ++pixelX) {
      const alpha = data[(pixelY * width + pixelX) * 4 + 3];
      if (alpha < IMAGE_ALPHA_THRESHOLD) continue;
      minX = Math.min(minX, pixelX);
      minY = Math.min(minY, pixelY);
      maxX = Math.max(maxX, pixelX);
      maxY = Math.max(maxY, pixelY);
    }
  }

  // Inclusive pixel extents preserve the final row and column of visible content.
  if (maxX < minX || maxY < minY) return null;
  return { x:minX, y:minY, width:maxX - minX + 1, height:maxY - minY + 1 };
}