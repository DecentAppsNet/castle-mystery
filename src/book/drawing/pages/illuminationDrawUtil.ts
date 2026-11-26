/* This file draws illuminated alphabet letters from the shared UI sprite sheet.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */
/* v8 ignore file -- Sprite drawing is verified visually. @preserve */

import { findVisibleImageSourceRect, ImageSet } from "@/imageLoading";
import Rect from "@/game/types/Rect";
import { createScratchCanvas, getScratchCanvasContext2d } from "@/game/drawing/canvasSurfaceUtil";
import { assertNonNullable } from "decent-portal";

import { ILLUMINATIONS_IMAGE_URL } from '@/common/builtInImageUrls';

const COLUMN_COUNT = 13; // Number of columns in the source image.
const ROW_COUNT = 2; // Number of rows in the source image.

let theLetterSourceRects:(Rect|null)[]|null = null;

function _createLetterSourceRects(image:ImageBitmap):(Rect|null)[] {
  const canvas = createScratchCanvas(image.width, image.height);
  const context = getScratchCanvasContext2d(canvas, true);
  context.drawImage(image, 0, 0);
  const { data } = context.getImageData(0, 0, image.width, image.height);
  const width = image.width / COLUMN_COUNT;
  const height = image.height / ROW_COUNT;
  return Array.from({ length:COLUMN_COUNT * ROW_COUNT }, (_, letterIndex) =>
    findVisibleImageSourceRect(data, image.width, image.height, {
      x:(letterIndex % COLUMN_COUNT) * width,
      y:Math.floor(letterIndex / COLUMN_COUNT) * height,
      width, height
    }));
}

/** Draw an illuminated letter to specified place on canvas.
 * 
 * /param letter Any Unicode character. It will be matched with case insensitivity to available illuminated letters.
 * /param canvasX X-coordinate for canvas destination.
 * /param canvasY Y-coordinate for canvas destination.
 * /param destinationWidth Width of the drawn letter in canvas pixels.
 * /param destinationHeight Height of the drawn letter in canvas pixels.
 * /param imageSet Image set loaded with any assets needed by this function.
 * /param context Canvas context to draw to.
*/
export function drawIllumination(letter:string, canvasX:number, canvasY:number, destinationWidth:number,
  destinationHeight:number, imageSet:ImageSet, context:CanvasRenderingContext2D):void {
  const upperLetter = letter.toUpperCase();
  const letterIndex = letter.length === 1 && upperLetter.length === 1
    ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.indexOf(upperLetter) : -1;

  if (letterIndex < 0) {
    context.save();
    context.font = `${destinationHeight}px im-fell-english, serif`;
    context.fillStyle = '#392b20';
    context.textAlign = 'left';
    context.textBaseline = 'alphabetic';
    const metrics = context.measureText(letter);
    const inkWidth = metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight;
    const inkHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;

    if (inkWidth > 0 && inkHeight > 0) {
      context.translate(canvasX, canvasY);
      context.scale(destinationWidth / inkWidth, destinationHeight / inkHeight);
      context.fillText(letter, metrics.actualBoundingBoxLeft, metrics.actualBoundingBoxAscent);
    }
    context.restore();
    return;
  }

  const image = imageSet.findImage(ILLUMINATIONS_IMAGE_URL)?.image ?? null;
  assertNonNullable(image);
  theLetterSourceRects ??= _createLetterSourceRects(image);
  const sourceRect = theLetterSourceRects[letterIndex];
  if (!sourceRect) return;
  context.drawImage(image, sourceRect.x, sourceRect.y, sourceRect.width, sourceRect.height,
    canvasX, canvasY, destinationWidth, destinationHeight);
}