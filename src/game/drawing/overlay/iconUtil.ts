/* This file groups drawing helpers for icons that overlay the game.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

/* v8 ignore file -- Visual canvas drawing is verified manually. @preserve */

import { assertNonNullable } from "decent-portal";

import { ImageSet } from "@/imageLoading";
import ControlLayout from "@/canvasControls/types/ControlLayout";
import { findControlRect, updateControlRect } from "@/canvasControls";

export const BOOK_ICON_IMAGE_URL = '/assets/ui/bookIcon.png';

export function updateOverlayIconsLayout(layout:ControlLayout, imageSet:ImageSet):void {
  const bookImage = imageSet.findImage(BOOK_ICON_IMAGE_URL);
  assertNonNullable(bookImage);
  const dimensions = bookImage.visibleSourceRect ?? bookImage.image;
  const height = layout.canvasHeight * 0.08;
  const width = height * (dimensions.width / dimensions.height);
  const margin = layout.canvasHeight * 0.02;
  const rect = { x:margin, y:margin, width, height };
  updateControlRect('book', rect, layout);
}

export function drawOverlayIcons(layout:ControlLayout, imageSet:ImageSet, context:CanvasRenderingContext2D):void {
  const bookImage = imageSet.findImage(BOOK_ICON_IMAGE_URL);
  if (!bookImage) return;
  const rect = findControlRect(layout, 'book');
  imageSet.drawImage(bookImage, rect.x, rect.y, rect.width, rect.height, context);
}