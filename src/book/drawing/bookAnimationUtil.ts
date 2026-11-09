import { assert, assertNonNullable, botch } from "decent-portal";
import BookState from "../types/BookState";
import BookLayout from "./types/BookLayout";

const APPEAR_ANIMATION_DURATION = 500;
const DISAPPEAR_ANIMATION_DURATION = 500;

type Offsets = Readonly<{offsetX:number, offsetY:number}>;
const ZERO_OFFSETS:Offsets = {offsetX:0, offsetY:0 };

function _calcHiddenBookOffsetY(layout:BookLayout):number {
  return layout.canvasHeight - layout.rect.y;
}

function _calcAppearOffsets(bookState:BookState, elapsed:number):Offsets {
  assert(elapsed < APPEAR_ANIMATION_DURATION);
  assertNonNullable(bookState.layout);
  const progress = elapsed / APPEAR_ANIMATION_DURATION;
  const offsetY = Math.pow(1 - progress, 3) * _calcHiddenBookOffsetY(bookState.layout);
  return { offsetX:0, offsetY };
}

function _calcDisappearOffsets(bookState:BookState, elapsed:number):Offsets {
  assert(elapsed < DISAPPEAR_ANIMATION_DURATION);
  assertNonNullable(bookState.layout);
  const progress = elapsed / DISAPPEAR_ANIMATION_DURATION;
  const offsetY = Math.pow(progress, 3) * _calcHiddenBookOffsetY(bookState.layout);
  return { offsetX:0, offsetY };
}

function _endCurrentAnimationAsNeeded(metaTime:number, bookState:BookState) {
  if (bookState.animationKind !== null) {
    const elapsed = metaTime - bookState.animationStartMetaTime;
    const isAborted = elapsed <= bookState.animationDuration;
    if (bookState.onAnimationEnd) bookState.onAnimationEnd(metaTime, isAborted, bookState);
    bookState.animationKind = null;
    // The next assignments aren't needed, but will show bugs better if code incorrectly tries to access these members.
    bookState.onAnimationEnd = null;
    bookState.animationDuration = 0;
    bookState.animationStartMetaTime = -1;
  }
}

export function getAnimationProgress(bookState:BookState, metaTime:number):number {
  if (!bookState.animationKind) return 0;
  const elapsed = metaTime - bookState.animationStartMetaTime;
  return (elapsed >= bookState.animationDuration) ? 1 : elapsed / bookState.animationDuration;
}

export function calcBookOffsetsForAnimationAndUpdate(metaTime:number, bookState:BookState):Offsets {
  assertNonNullable(bookState.animationKind);
  
  const elapsed = metaTime - bookState.animationStartMetaTime;
  if (elapsed >= bookState.animationDuration) {
    _endCurrentAnimationAsNeeded(metaTime, bookState);
    return ZERO_OFFSETS;
  }

  switch (bookState.animationKind) {
    case 'appear': return _calcAppearOffsets(bookState, elapsed);
    case 'disappear': return _calcDisappearOffsets(bookState, elapsed);
    default:
      botch();
  }
}

export function showBook(metaTime:number, bookState:BookState) {
  _endCurrentAnimationAsNeeded(metaTime, bookState);
  bookState.animationKind = 'appear';
  bookState.animationDuration = APPEAR_ANIMATION_DURATION;
  bookState.animationStartMetaTime = metaTime;
  bookState.isVisible = true;
}

export function hideBook(metaTime:number, bookState:BookState) {
  _endCurrentAnimationAsNeeded(metaTime, bookState);
  bookState.animationKind = 'disappear';
  bookState.animationDuration = DISAPPEAR_ANIMATION_DURATION;
  bookState.animationStartMetaTime = metaTime;
  bookState.isVisible === true;
  bookState.onAnimationEnd = (_metaTime, _isAborted, bookState2) => bookState2.isVisible = false;
}