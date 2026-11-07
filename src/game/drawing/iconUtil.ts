/* This file groups drawing helpers for icons that overlay the game.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

/* v8 ignore file -- Visual canvas drawing is verified manually. @preserve */

import { findImageBitmap } from "../imageAssetUtil";
import ImageSet from "../types/ImageSet";

export const BOOK_ICON_IMAGE_URL = '/assets/ui/bookIcon.png';

export function drawOverlayIcons(imageSet:ImageSet, context:CanvasRenderingContext2D):void {
  const bookImage = findImageBitmap(imageSet, BOOK_ICON_IMAGE_URL);
  if (!bookImage) return;
  const height = context.canvas.height * 0.08;
  const width = height * (bookImage.width / bookImage.height);
  const margin = context.canvas.height * 0.02;
  context.drawImage(bookImage, margin, margin, width, height);
}