import { assert, assertNonNullable, botch } from "decent-portal";

import ImageSet from "@/game/types/ImageSet";
import BookState from "../types/BookState";
import { findImageBitmap } from "@/game/imageAssetUtil";
import { calcBookDrawRect, calcPageViewOffsetX, isLeftPageNo, updateBookLayoutAsNeeded } from "./bookLayoutUtil";
import { getAnimationProgress } from "./bookAnimationUtil";
import { drawPageFlip } from "./pageFlipAnimationUtil";
import Rect from "@/game/types/Rect";
import { drawPage } from "./pageDrawUtil";

export const BOOK_IMAGE_URL = '/assets/ui/book.png';

const BACKGROUND_ALPHA = .7;
const BOOK_CONTROL_ALPHA = .8;

function _drawTranslucentBackground(bookState:BookState, metaTime:number, context:CanvasRenderingContext2D) {
  let alphaFadeAmount = 1;
  if (bookState.animationKind === 'appear') {
    alphaFadeAmount = getAnimationProgress(bookState, metaTime);
  } else if (bookState.animationKind === 'disappear') {
    alphaFadeAmount = 1 - getAnimationProgress(bookState, metaTime);
  }

  context.save();
  context.fillStyle = 'black';
  context.globalAlpha = BACKGROUND_ALPHA * alphaFadeAmount;
  context.fillRect(0, 0, context.canvas.width, context.canvas.height);
  context.restore();
}

function _drawLeftArrow(context:CanvasRenderingContext2D) {
  context.moveTo(.1, .5);
  context.lineTo(.5, .1);
  context.lineTo(.5, .35);
  context.lineTo(.9, .35);
  context.lineTo(.9, .65);
  context.lineTo(.5, .65);
  context.lineTo(.5, .9);
}

function _drawRightArrow(context:CanvasRenderingContext2D) {
  context.translate(1, 0);
  context.scale(-1, 1);
  _drawLeftArrow(context);
}

function _drawCloseIcon(context:CanvasRenderingContext2D) {
  context.moveTo(.2, .1);
  context.lineTo(.5, .4);
  context.lineTo(.8, .1);
  context.lineTo(.9, .2);
  context.lineTo(.6, .5);
  context.lineTo(.9, .8);
  context.lineTo(.8, .9);
  context.lineTo(.5, .6);
  context.lineTo(.2, .9);
  context.lineTo(.1, .8);
  context.lineTo(.4, .5);
  context.lineTo(.1, .2);
}

function _drawBookControls(bookState:BookState, context:CanvasRenderingContext2D) {
  const { layout } = bookState;
  assertNonNullable(layout);
  const drawOffsetX = calcPageViewOffsetX(bookState);
  context.save();
  context.fillStyle = 'white';
  context.globalAlpha = BOOK_CONTROL_ALPHA;
  for (const control of layout.controlLayout.controls) {
    if (!control.isVisible) continue;
    context.save();
    
    if (control.id === layout.controlLayout.hoveredControlId) context.fillStyle = 'yellow';
    
    context.translate(control.rect.x + drawOffsetX, control.rect.y);
    context.scale(control.rect.width, control.rect.height);
    context.beginPath();
    switch(control.id) {
      case 'closeBook': _drawCloseIcon(context); break;
      case 'nextPage': _drawRightArrow(context); break;
      case 'prevPage': _drawLeftArrow(context); break;
      default: botch();
    }
    context.closePath();
    context.fill();
    context.restore();
  }
  context.restore();
}

function _drawPageContent(bookState:BookState, metaTime:number, bookDrawRect:Rect, context:CanvasRenderingContext2D) {
  const isOnLeftPage = isLeftPageNo(bookState.pageNo);
  const leftPageNo = isOnLeftPage ? bookState.pageNo : bookState.pageNo - 1;
  const rightPageNo = isOnLeftPage ? bookState.pageNo + 1 : bookState.pageNo;
  const width = bookDrawRect.width / 2;
  const leftPageRect = { ...bookDrawRect, width};
  const rightPageRect = { ...bookDrawRect, x:bookDrawRect.x + width, width };
  drawPage(bookState.pages[leftPageNo-1], metaTime, leftPageNo, leftPageRect, context);
  drawPage(bookState.pages[rightPageNo-1], metaTime, rightPageNo, rightPageRect, context);
}

export function drawBook(bookState:BookState, metaTime:number, imageSet:ImageSet, context:CanvasRenderingContext2D) {
  assert(bookState.isVisible); // Prefer caller to check for readability.
  const bookImage = findImageBitmap(imageSet, BOOK_IMAGE_URL);
  assertNonNullable(bookImage);
  updateBookLayoutAsNeeded(context.canvas.width, context.canvas.height, bookImage, bookState);
  assertNonNullable(bookState.layout);
  const drawRect = calcBookDrawRect(bookState, metaTime);
  const { x, y, width, height } = drawRect;
  if (!bookState.isVisible) return; // Animations have hidden the book.
  _drawTranslucentBackground(bookState, metaTime, context);
  context.drawImage(bookImage, x, y, width, height);
  _drawPageContent(bookState, metaTime, drawRect, context);
  drawPageFlip(bookState, metaTime, drawRect, bookImage, imageSet, context);
  if (bookState.animationKind === null) _drawBookControls(bookState, context);
}