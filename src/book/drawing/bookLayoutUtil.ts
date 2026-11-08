import Rect from "@/game/types/Rect";
import BookState from "../types/BookState";
import ControlLayout from "@/canvasControls/types/ControlLayout";
import { assert, assertNonNullable } from "decent-portal";
import BookLayout from "./types/BookLayout";
import { calcBookOffsetsForAnimationAndUpdate } from "./bookAnimationUtil";
import { createLayout, updateControlRect } from "@/canvasControls";

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

// Returns a rect defining the canvas-local area for placing buttons below the book.
function _calcBelowBookButtonAreaRect(bookRect:Rect, isSinglePageView:boolean, pageNo:number):Rect {
  const rect = {...bookRect};
  rect.y += (bookRect.height * .99);
  rect.height = bookRect.height * .05;
  if (isSinglePageView) {
    const isLeftPage = _isLeftPageNo(pageNo);
    const pageWidth = rect.width / 2;
    rect.width = pageWidth;
    if (!isLeftPage) rect.x += pageWidth;
  }
  return rect;
}

function _updateControlRect(controlId:BookControlId, rect:Rect, layout:ControlLayout) {
  return updateControlRect(controlId as string, rect, layout);
}

function _addBelowBookButtonControls(belowBookButtonAreaRect:Rect, layout:ControlLayout) {
  const width = belowBookButtonAreaRect.width * .05; // Using .height to preserve aspect ratio.
  const y = belowBookButtonAreaRect.y;
  const height = belowBookButtonAreaRect.height;
  _updateControlRect('prevPage', { x:belowBookButtonAreaRect.x, y, width, height }, layout);
  _updateControlRect('nextPage', { x:belowBookButtonAreaRect.x + belowBookButtonAreaRect.width - width, y, width, height }, layout);
  _updateControlRect('closeBook', { x:belowBookButtonAreaRect.x + (belowBookButtonAreaRect.width - width) / 2, y, width, height }, layout);
}

function _createBookControlLayout(canvasWidth:number, canvasHeight:number, bookRect:Rect, isSinglePageView:boolean, pageNo:number):ControlLayout {
  const layout = createLayout(canvasWidth, canvasHeight);
  const belowBookButtonAreaRect = _calcBelowBookButtonAreaRect(bookRect, isSinglePageView, pageNo);
  _addBelowBookButtonControls(belowBookButtonAreaRect, layout);
  return layout;
}

function _isLeftPageNo(pageNo:number):boolean {
  return pageNo % 2 === 1;
}

export function updateBookLayoutAsNeeded(canvasWidth:number, canvasHeight:number, bookImage:ImageBitmap, bookState:BookState) {
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

  const controlLayout = _createBookControlLayout(canvasWidth, canvasHeight, rect, isSinglePageView, bookState.pageNo);

  bookState.layout = {
    canvasWidth, canvasHeight,
    isSinglePageView,
    singlePageViewOffsetX,
    rect,
    controlLayout
  }
}

function _calcSinglePageDrawRect(layout:BookLayout, pageNo:number):Rect {
  const x = layout.rect.x + (_isLeftPageNo(pageNo) ? layout.singlePageViewOffsetX : -layout.singlePageViewOffsetX );
  return { ...layout.rect, x };
}

export function calcBookDrawRect(bookState:BookState, metaTime:number):Rect {
  assertNonNullable(bookState.layout);
  const drawRect = bookState.layout.isSinglePageView 
    ? _calcSinglePageDrawRect(bookState.layout, bookState.pageNo)
    : { ...bookState.layout.rect };
  if (bookState.animationKind !== null) {
    const { offsetX, offsetY } = calcBookOffsetsForAnimationAndUpdate(metaTime, bookState);
    drawRect.x += offsetX;
    drawRect.y += offsetY;
  }
  return drawRect;
}