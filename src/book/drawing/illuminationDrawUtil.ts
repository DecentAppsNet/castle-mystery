/* This file draws illuminated alphabet letters from the shared UI sprite sheet.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */
/* v8 ignore file -- Sprite drawing is verified visually. @preserve */

import ImageSet from "@/game/types/ImageSet";
import { findImageBitmap } from "@/game/imageAssetUtil";
import { assertNonNullable } from "decent-portal";

export const ILLUMINATIONS_IMAGE_URL = '/assets/ui/illuminations.png'; // Only contains English alphabet (26 letters).
const COLUMN_COUNT = 13; // Number of columns in the source image.
const ROW_COUNT = 2; // Number of rows in the source image.

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

  const image = findImageBitmap(imageSet, ILLUMINATIONS_IMAGE_URL);
  assertNonNullable(image);
  const width = image.width / COLUMN_COUNT;
  const height = image.height / ROW_COUNT;
  const sourceX = (letterIndex % COLUMN_COUNT) * width;
  const sourceY = Math.floor(letterIndex / COLUMN_COUNT) * height;
  context.drawImage(image, sourceX, sourceY, width, height, canvasX, canvasY, destinationWidth, destinationHeight);
}