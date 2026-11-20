/* This file routes book mouse events to controls, dismissal, and loose-piece interactions.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assert } from "decent-portal";

import { isPositionInRect } from "@/game/rectUtil";
import BookState from "./types/BookState";
import { hideBook } from "./drawing/bookAnimationUtil";
import { calcPageViewOffsetX } from "./drawing/bookLayoutUtil";
import { findControlAtPoint } from "@/canvasControls";
import { goNextPage, goPrevPage } from "./navigationUtil";
import BookControlId from "./drawing/types/BookControlId";
import { beginBookPieceDrag, bringBookPieceToFront, releaseBookPieceDrag, findBookPieceAtPoint,
  moveBookPieceDrag } from "./pieceInteractionUtil";
import { claimBookConclusion } from './bookClaimControlUtil';

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

export function onBookMouseDown(canvasX:number, canvasY:number, metaTime:number, bookState:BookState,
  canStartPieceDrag:boolean = false):boolean {
  assert(bookState.isVisible); // Caller should check.
  if (!bookState.layout || bookState.animationKind || bookState.pieceDragState !== null) return false;

  const id = _findControlAtPoint(bookState, canvasX, canvasY);
  const piece = id === null ? findBookPieceAtPoint(bookState, canvasX, canvasY) : null;
  if (piece !== null) {
    if (canStartPieceDrag) return beginBookPieceDrag(bookState, canvasX, canvasY);
    bringBookPieceToFront(bookState, piece);
    return false;
  }
  if (id === null && canStartPieceDrag && beginBookPieceDrag(bookState, canvasX, canvasY)) return true;
  if (id === 'closeBook' || (id === null && piece === null && !_isPointInsideBook(bookState, canvasX, canvasY))) {
    hideBook(metaTime, bookState);
    return false;
  }

  if (id === 'prevPage') goPrevPage(metaTime, bookState);
  if (id === 'nextPage') goNextPage(metaTime, bookState);
  if (id === 'claimLeft' || id === 'claimRight') {
    const leftPageNo = bookState.pageNo % 2 === 1 ? bookState.pageNo : bookState.pageNo - 1;
    claimBookConclusion(bookState, leftPageNo + (id === 'claimRight' ? 1 : 0));
  }
  return false;
}

export function onBookMouseUp(canvasX:number, canvasY:number, _metaTime:number, bookState:BookState) {
  if (bookState.pieceDragState !== null) {
    releaseBookPieceDrag(bookState, canvasX, canvasY);
    return;
  }
  assert(bookState.isVisible); // Caller should check.
  if (!bookState.layout || bookState.animationKind) return;

  const id = _findControlAtPoint(bookState, canvasX, canvasY);
  if (id !== null) console.log('mouse up on ' + id);
}

export function onBookMouseOver(canvasX:number, canvasY:number, _metaTime:number, bookState:BookState) {
  if (bookState.pieceDragState !== null) {
    moveBookPieceDrag(bookState, canvasX, canvasY);
    return;
  }
  assert(bookState.isVisible); // Caller should check.
  if (!bookState.layout || bookState.animationKind) return;
  
  bookState.layout.controlLayout.hoveredControlId = _findControlAtPoint(bookState, canvasX, canvasY);
}

export function onBookMouseWheel(_deltaY:number, _metaTime:number, bookState:BookState) {
  assert(bookState.isVisible); // Caller should check.
  if (!bookState.layout || bookState.animationKind) return;
}