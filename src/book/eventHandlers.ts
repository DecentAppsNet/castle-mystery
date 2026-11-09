import { assert } from "decent-portal";

import { isPositionInRect } from "@/game/rectUtil";
import BookState from "./types/BookState";
import { hideBook } from "./drawing/bookAnimationUtil";
import { calcPageViewOffsetX } from "./drawing/bookLayoutUtil";
import { findControlAtPoint } from "@/canvasControls";
import { goNextPage, goPrevPage } from "./navigationUtil";
import BookControlId from "./drawing/types/BookControlId";

function _findControlAtPoint(bookState:BookState, canvasX:number, canvasY:number):BookControlId|null {
  if (!bookState.layout) return null;
  const pageViewOffsetX = calcPageViewOffsetX(bookState);
  const result = findControlAtPoint(bookState.layout.controlLayout, canvasX - pageViewOffsetX, canvasY);
  return result === null ? null : result as BookControlId;
}

function _isPointInsideBook(bookState:BookState, canvasX:number, canvasY:number):boolean {
  if (!bookState.layout) return false;
  const pageViewOffsetX = calcPageViewOffsetX(bookState);
  const rect = { ...bookState.layout.rect, x:bookState.layout.rect.x + pageViewOffsetX};
  return isPositionInRect(canvasX, canvasY, rect);
}

export function onBookMouseDown(canvasX:number, canvasY:number, metaTime:number, bookState:BookState) {
  assert(bookState.isVisible); // Caller should check.
  if (!bookState.layout || bookState.animationKind) return;

  const id = _findControlAtPoint(bookState, canvasX, canvasY);
  if (id === 'closeBook' || (id === null && !_isPointInsideBook(bookState, canvasX, canvasY))) {
    hideBook(metaTime, bookState);
    return;
  }

  if (id === 'prevPage') return goPrevPage(metaTime, bookState);
  if (id == 'nextPage') return goNextPage(metaTime, bookState);
}

export function onBookMouseUp(canvasX:number, canvasY:number, _metaTime:number, bookState:BookState) {
  assert(bookState.isVisible); // Caller should check.
  if (!bookState.layout || bookState.animationKind) return;

  const id = _findControlAtPoint(bookState, canvasX, canvasY);
  if (id !== null) console.log('mouse up on ' + id);
}

export function onBookMouseOver(canvasX:number, canvasY:number, _metaTime:number, bookState:BookState) {
  assert(bookState.isVisible); // Caller should check.
  if (!bookState.layout || bookState.animationKind) return;
  
  bookState.layout.controlLayout.hoveredControlId = _findControlAtPoint(bookState, canvasX, canvasY);
}

export function onBookMouseWheel(_deltaY:number, _metaTime:number, bookState:BookState) {
  assert(bookState.isVisible); // Caller should check.
  if (!bookState.layout || bookState.animationKind) return;
}