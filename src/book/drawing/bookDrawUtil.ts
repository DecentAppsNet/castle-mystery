import { assert, assertNonNullable } from "decent-portal";

import ImageSet from "@/game/types/ImageSet";
import BookState, { createDefaultBookState } from "../types/BookState";
import { findImageBitmap } from "@/game/imageAssetUtil";
import { calcBookDrawRect, updateBookLayoutAsNeeded } from "./bookLayoutUtil";
import BookLayout from "./types/BookLayout";
import { getAnimationProgress } from "./bookAnimationUtil";

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

function _drawBookControls(layout:BookLayout, drawOffsetX:number, drawOffsetY:number, context:CanvasRenderingContext2D) {
  context.save();
  context.fillStyle = 'white';
  context.globalAlpha = BOOK_CONTROL_ALPHA;
  for (const control of layout.controlLayout.controls) {
    if (control.id !== 'prevPage' && control.id !== 'nextPage' && control.id !== 'closeBook') continue;
    context.save();
    context.translate(control.rect.x + drawOffsetX, control.rect.y + drawOffsetY);
    context.scale(control.rect.width, control.rect.height);
    context.beginPath();
    if (control.id === 'closeBook') {
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
    } else {
      if (control.id === 'nextPage') {
        context.translate(1, 0);
        context.scale(-1, 1);
      }
      context.moveTo(.1, .5);
      context.lineTo(.5, .1);
      context.lineTo(.5, .35);
      context.lineTo(.9, .35);
      context.lineTo(.9, .65);
      context.lineTo(.5, .65);
      context.lineTo(.5, .9);
    }
    context.closePath();
    context.fill();
    context.restore();
  }
  context.restore();
}

export function drawBook(bookState:BookState, metaTime:number, imageSet:ImageSet, context:CanvasRenderingContext2D) {
  assert(bookState.isVisible); // Prefer caller to check for readability.
  const bookImage = findImageBitmap(imageSet, BOOK_IMAGE_URL);
  assertNonNullable(bookImage);
  updateBookLayoutAsNeeded(context.canvas.width, context.canvas.height, bookImage, bookState);
  assertNonNullable(bookState.layout);
  const { x, y, width, height } = calcBookDrawRect(bookState, metaTime);
  if (!bookState.isVisible) return; // Animations have hidden the book.
  _drawTranslucentBackground(bookState, metaTime, context);
  context.drawImage(bookImage, x, y, width, height);
  if (bookState.animationKind === null) {
    _drawBookControls(bookState.layout, x - bookState.layout.rect.x, y - bookState.layout.rect.y, context);
  }
}

export function createBookState():BookState { // TODO this will change later to take some data, similar to createGameState().
  const bookState = createDefaultBookState();
  bookState.pages = [
    { kind:'blank' },
    { kind:'bookStart' },
  ];
  bookState.pageNo = 1;
  bookState.isVisible = false;
  return bookState;
}