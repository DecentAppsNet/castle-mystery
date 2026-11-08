import ImageSet from "@/game/types/ImageSet";
import BookState, { createDefaultBookState } from "../types/BookState";
import BookLayout from "./types/BookLayout";
import { findImageBitmap } from "@/game/imageAssetUtil";
import { assert, assertNonNullable } from "decent-portal";
import Rect from "@/game/types/Rect";

export const BOOK_IMAGE_URL = '/assets/ui/book.png';

const CANVAS_HEIGHT_TO_OUTER_MARGIN_RATIO = .05;

function _calcDoublePageViewRect(targetWidth:number, targetHeight:number, outerMargin:number, canvasWidth:number):Rect {
  return {
    x:(canvasWidth - targetWidth) / 2,
    y:outerMargin,
    width:targetWidth,
    height:targetHeight
  }
}

function _calcSinglePageViewRect(sourceWidth:number, sourceHeight:number, fitWidth:number, fitHeight:number, 
    outerMargin:number, canvasWidth:number, canvasHeight:number):Rect {
  const pageSourceWidth = sourceWidth / 2;

  // If one page (half of a book) could fit at full height, then just return double page rect. Separate calcs will be made later to offset
  // X of the book to show either left or right page.
  const scaledPageWidth = pageSourceWidth * fitHeight / sourceHeight;
  if (scaledPageWidth <= fitWidth) return _calcDoublePageViewRect(scaledPageWidth * 2, fitHeight, outerMargin, canvasWidth);
    
  // We have a narrow form factor that needs scaling to be based on fitting one page at full width, rather than height.

  // Find scaled height for fitting one page at full fit width.
  //  fitWidth.    pageSourceWidth
  //  ---        = ---
  //  X            sourceHeight
  const scaledHeight = sourceHeight * fitWidth / pageSourceWidth;
  assert(scaledHeight < fitHeight);
  
  // Find scaled width of entire book based on scaled height of fitting one page within fit width.
  // x             sourceWidth
  // ---         = ---
  // scaledHeight. sourceHeight
  const scaledWidth = scaledHeight * sourceWidth / sourceHeight;

  return {
    x:(canvasWidth - scaledWidth) / 2,
    y:(canvasHeight - scaledHeight) / 2,
    width:scaledWidth,
    height:scaledHeight
  }
}

function _updateBookLayoutAsNeeded(canvasWidth:number, canvasHeight:number, bookImage:ImageBitmap, layout:BookLayout) {
  if (canvasWidth === layout.canvasWidth && canvasHeight === layout.canvasHeight) return;

  layout.canvasHeight = canvasHeight;
  layout.canvasWidth = canvasWidth;

  const outerMargin = canvasHeight * CANVAS_HEIGHT_TO_OUTER_MARGIN_RATIO;
  const fitHeight = canvasHeight - (outerMargin * 2);
  const fitWidth = canvasWidth - (outerMargin * 2);

  const scaledWidth = bookImage.width * fitHeight / bookImage.height;
  layout.isSinglePageView = scaledWidth > fitWidth;
  layout.rect = layout.isSinglePageView 
    ? _calcSinglePageViewRect(bookImage.width, bookImage.height, fitWidth, fitHeight, outerMargin, canvasWidth, canvasHeight)
    : _calcDoublePageViewRect(scaledWidth, fitHeight, outerMargin, canvasWidth);
}

export function drawBook(bookState:BookState, _metaTime:number, imageSet:ImageSet, context:CanvasRenderingContext2D) {
  const bookImage = findImageBitmap(imageSet, BOOK_IMAGE_URL);
  assertNonNullable(bookImage);
  _updateBookLayoutAsNeeded(context.canvas.width, context.canvas.height, bookImage, bookState.layout);
  const { x, y, width, height } = bookState.layout.rect;
  context.drawImage(bookImage, x, y, width, height);
}

export function createBookState():BookState { // TODO this will change later to take some data, similar to createGameState().
  return createDefaultBookState();
}