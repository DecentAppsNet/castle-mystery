import { assertNonNullable, botch } from "decent-portal";
import BookState from "../types/BookState";
import BookLayout from "./types/BookLayout";

const APPEAR_ANIMATION_DURATION = 500;
const DISAPPEAR_ANIMATION_DURATION = 200;

type Offsets = Readonly<{offsetX:number, offsetY:number}>;
const ZERO_OFFSETS:Offsets = {offsetX:0, offsetY:0 };

function _calcHiddenBookOffsetY(layout:BookLayout):number {
  return layout.canvasHeight - layout.rect.x;
}

function _calcAppearOffsets(bookState:BookState, elapsed:number):Offsets|null {
  if (elapsed > APPEAR_ANIMATION_DURATION) return null;

  assertNonNullable(bookState.layout);
  const progress = elapsed / APPEAR_ANIMATION_DURATION;
  const offsetY = Math.pow(1 - progress, 3) * _calcHiddenBookOffsetY(bookState.layout);
  return { offsetX:0, offsetY };
}

function _calcDisappearOffsets(bookState:BookState, elapsed:number):Offsets|null {
  if (elapsed > DISAPPEAR_ANIMATION_DURATION) return null;

  assertNonNullable(bookState.layout);
  const offsetY = (elapsed / DISAPPEAR_ANIMATION_DURATION) * _calcHiddenBookOffsetY(bookState.layout);
  return { offsetX:0, offsetY };
}

export function calcBookOffsetsForAnimationAndUpdate(metaTime:number, bookState:BookState):Offsets {
  assertNonNullable(bookState.animationKind);
  const elapsed = metaTime - bookState.animationStartMetaTime;
  let result:Offsets|null = null;
  switch (bookState.animationKind) {
    case 'appear':
      result = _calcAppearOffsets(bookState, elapsed);
    break;

    case 'disappear': 
      result = _calcDisappearOffsets(bookState, elapsed);
    break;

    default:
      botch();
  }
  if (result) return result;

  // Completed animation.
  if (bookState.onAnimationEnd) bookState.onAnimationEnd(metaTime, false, bookState);
  bookState.animationKind = null;
  bookState.onAnimationEnd = null;
  return ZERO_OFFSETS;
}

function _abortCurrentAnimationAsNeeded(metaTime:number, bookState:BookState) {
  if (bookState.animationKind !== null && bookState.onAnimationEnd) bookState.onAnimationEnd(metaTime, true, bookState);
}

export function showBook(metaTime:number, bookState:BookState) {
  _abortCurrentAnimationAsNeeded(metaTime, bookState);
  bookState.animationKind = 'appear';
  bookState.animationStartMetaTime = metaTime;
  bookState.isVisible = true;
}

export function hideBook(metaTime:number, bookState:BookState) {
  _abortCurrentAnimationAsNeeded(metaTime, bookState);
  bookState.animationKind = 'disappear';
  bookState.animationStartMetaTime = metaTime;
  bookState.isVisible === true;
  bookState.onAnimationEnd = (_metaTime, _isAborted, bookState2) => bookState2.isVisible = false;
}