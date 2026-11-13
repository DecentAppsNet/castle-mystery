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
 * /param imageSet Image set loaded with any assets needed by this function.
 * /param context Canvas context to draw to.
 * /return True if letter could be matched to an illuminated letter, false if not.
*/
export function drawIllumination(letter:string, canvasX:number, canvasY:number, imageSet:ImageSet, context:CanvasRenderingContext2D):boolean {
  const upperLetter = letter.toUpperCase();
  if (letter.length !== 1 || upperLetter.length !== 1) return false;
  const letterIndex = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.indexOf(upperLetter);
  if (letterIndex < 0) return false;

  const image = findImageBitmap(imageSet, ILLUMINATIONS_IMAGE_URL);
  assertNonNullable(image);
  const width = image.width / COLUMN_COUNT;
  const height = image.height / ROW_COUNT;
  const sourceX = (letterIndex % COLUMN_COUNT) * width;
  const sourceY = Math.floor(letterIndex / COLUMN_COUNT) * height;
  context.drawImage(image, sourceX, sourceY, width, height, canvasX, canvasY, width, height);
  return true;
}