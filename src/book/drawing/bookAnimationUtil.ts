import { assert, assertNonNullable, botch } from "decent-portal";
import BookState from "../types/BookState";
import BookLayout from "./types/BookLayout";
import { isLeftPageNo } from "./bookLayoutUtil";
import { setPageNavigationButtonVisibility } from "../navigationUtil";

const APPEAR_ANIMATION_DURATION = 500;
const DISAPPEAR_ANIMATION_DURATION = 500;
const SHIFT_LEFT_RIGHT_ANIMATION_DURATION = 500;

type Offsets = Readonly<{offsetX:number, offsetY:number}>;
const ZERO_OFFSETS:Offsets = {offsetX:0, offsetY:0 };

function _calcHiddenBookOffsetY(layout:BookLayout):number {
  return layout.canvasHeight - layout.rect.y;
}

function _calcShiftOffsets(bookState:BookState, elapsed:number, direction:-1|1):Offsets {
  assert(elapsed < SHIFT_LEFT_RIGHT_ANIMATION_DURATION);
  assertNonNullable(bookState.layout);
  const progress = elapsed / SHIFT_LEFT_RIGHT_ANIMATION_DURATION;
  const easedProgress = progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
  const offsetX = (1 - easedProgress) * direction * 2 * bookState.layout.singlePageViewOffsetX;
  return { offsetX, offsetY:0 };
}

function _calcShiftLeftOffsets(bookState:BookState, elapsed:number):Offsets {
  assert(isLeftPageNo(bookState.pageNo)); // Book needs to be viewing a left page for the animation offset to work.
  return _calcShiftOffsets(bookState, elapsed, -1);
}

function _calcShiftRightOffsets(bookState:BookState, elapsed:number):Offsets {
  assert(!isLeftPageNo(bookState.pageNo)); // Book needs to be viewing a right page for the animation offset to work.
  return _calcShiftOffsets(bookState, elapsed, 1);
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
    case 'shiftLeft': return _calcShiftLeftOffsets(bookState, elapsed);
    case 'shiftRight': return _calcShiftRightOffsets(bookState, elapsed);
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
  bookState.onAnimationEnd = (_metaTime, _isAborted, bookState2) => setPageNavigationButtonVisibility(bookState2); // Need book to be drawn once before this can be called.
}

export function hideBook(metaTime:number, bookState:BookState) {
  assertNonNullable(bookState.layout);
  _endCurrentAnimationAsNeeded(metaTime, bookState);
  bookState.animationKind = 'disappear';
  bookState.animationDuration = DISAPPEAR_ANIMATION_DURATION;
  bookState.animationStartMetaTime = metaTime;
  bookState.isVisible === true;
  bookState.layout.controlLayout.hoveredControlId = null;
  bookState.onAnimationEnd = (_metaTime, _isAborted, bookState2) => bookState2.isVisible = false;
}

export function shiftBookLeft(metaTime:number, bookState:BookState) {
  _endCurrentAnimationAsNeeded(metaTime, bookState);
  bookState.animationKind = 'shiftLeft';
  bookState.animationDuration = SHIFT_LEFT_RIGHT_ANIMATION_DURATION;
  bookState.animationStartMetaTime = metaTime;
}

export function shiftBookRight(metaTime:number, bookState:BookState) {
  _endCurrentAnimationAsNeeded(metaTime, bookState);
  bookState.animationKind = 'shiftRight';
  bookState.animationDuration = SHIFT_LEFT_RIGHT_ANIMATION_DURATION;
  bookState.animationStartMetaTime = metaTime;
}