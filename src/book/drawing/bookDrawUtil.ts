import ImageSet from "@/game/types/ImageSet";
import BookState, { createDefaultBookState } from "../types/BookState";
import BookLayout from "./types/BookLayout";
import { findImageBitmap } from "@/game/imageAssetUtil";
import { assert, assertNonNullable } from "decent-portal";
import Rect from "@/game/types/Rect";

export const BOOK_IMAGE_URL = '/assets/ui/book.png';

const CANVAS_HEIGHT_TO_OUTER_MARGIN_RATIO = .05;
const BACKGROUND_ALPHA = .5;

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

function _updateBookLayoutAsNeeded(canvasWidth:number, canvasHeight:number, bookImage:ImageBitmap, bookState:BookState) {
  if (bookState.layout && canvasWidth === bookState.layout.canvasWidth && canvasHeight === bookState.layout.canvasHeight) return;

  const outerMargin = canvasHeight * CANVAS_HEIGHT_TO_OUTER_MARGIN_RATIO;
  const fitHeight = canvasHeight - (outerMargin * 2);
  const fitWidth = canvasWidth - (outerMargin * 2);

  const scaledWidth = bookImage.width * fitHeight / bookImage.height;
  const isSinglePageView = scaledWidth > fitWidth;
  const rect = isSinglePageView 
    ? _calcSinglePageViewRect(bookImage.width, bookImage.height, fitWidth, fitHeight, outerMargin, canvasWidth, canvasHeight)
    : _calcDoublePageViewRect(scaledWidth, fitHeight, outerMargin, canvasWidth);
  const singlePageViewOffsetX = rect.width / 4; // Half the width of one page.

  bookState.layout = {
    canvasWidth, canvasHeight,
    isSinglePageView,
    singlePageViewOffsetX,
    rect
  }
}

function _calcSinglePageDrawRect(layout:BookLayout, pageNo:number):Rect {
  const isLeftPage = (pageNo % 2) === 1;
  const x = layout.rect.x + (isLeftPage ? layout.singlePageViewOffsetX : -layout.singlePageViewOffsetX );
  return { ...layout.rect, x };
}

function _calcBookDrawRect(bookState:BookState, _metaTime:number):Rect {
  assertNonNullable(bookState.layout);
  const drawRect = bookState.layout.isSinglePageView 
    ? _calcSinglePageDrawRect(bookState.layout, bookState.pageNo)
    : bookState.layout.rect;
  // TODO animation adjustments.
  return drawRect;
}

function _drawTranslucentBackground(context:CanvasRenderingContext2D) {
  context.save();
  context.fillStyle = 'black';
  context.globalAlpha = BACKGROUND_ALPHA;
  context.fillRect(0, 0, context.canvas.width, context.canvas.height);
  context.restore();
}

export function drawBook(bookState:BookState, metaTime:number, imageSet:ImageSet, context:CanvasRenderingContext2D) {
  assert(bookState.isVisible); // Prefer caller to check for readability.
  const bookImage = findImageBitmap(imageSet, BOOK_IMAGE_URL);
  assertNonNullable(bookImage);
  _updateBookLayoutAsNeeded(context.canvas.width, context.canvas.height, bookImage, bookState);
  const { x, y, width, height } = _calcBookDrawRect(bookState, metaTime);
  _drawTranslucentBackground(context);
  context.drawImage(bookImage, x, y, width, height);
}

export function createBookState():BookState { // TODO this will change later to take some data, similar to createGameState().
  const bookState = createDefaultBookState();
  bookState.pages = [
    { kind:'blank' },
    { kind:'bookStart' },
  ];
  bookState.pageNo = 1;
  bookState.isVisible = true;
  return bookState;
}