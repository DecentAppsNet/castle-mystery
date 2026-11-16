/* This file manages loose-piece stacking, lookup, and dragging using book content and prepared canvas layout records.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { calcClampedDragCenter, calcDragGrabOffset, findTopmostControlAtPoint } from "@/canvasControls";
import { assert, assertNonNullable } from "decent-portal";
import { calcPageViewOffsetX, isLeftPageNo } from "./drawing/bookLayoutUtil";
import BookState from "./types/BookState";
import Piece from "./types/Piece";

export function getVisibleBookPieces(bookState:Readonly<BookState>):Piece[] {
  const leftPageNo = isLeftPageNo(bookState.pageNo) ? bookState.pageNo : bookState.pageNo - 1;
  const visibleConclusionIds = new Set(bookState.pages.slice(leftPageNo - 1, leftPageNo + 1)
    .flatMap(page => page.kind === 'conclusion' ? [page.conclusion.id] : []));
  return bookState.pieceStack.filter(piece => visibleConclusionIds.has(piece.conclusionId));
}

export function bringBookPieceToFront(bookState:BookState, piece:Piece):void {
  const visiblePieces = getVisibleBookPieces(bookState);
  assert(visiblePieces.includes(piece));
  bookState.pieceStack = [...bookState.pieceStack.filter(candidate => candidate !== piece), piece];

  const { layout } = bookState;
  if (layout) {
    layout.pieceLayouts = layout.pieceLayouts.filter(record => visiblePieces.includes(record.piece))
      .sort((first, second) => bookState.pieceStack.indexOf(first.piece) - bookState.pieceStack.indexOf(second.piece));
  }
}

export function findBookPieceAtPoint(bookState:Readonly<BookState>, canvasX:number, canvasY:number):Piece|null {
  const { layout } = bookState;
  if (!bookState.isVisible || bookState.animationKind !== null || !layout
    || layout.pieceLayoutsPageNo !== bookState.pageNo) return null;

  // Reject obsolete references even if the selected page number has not changed.
  const visiblePieces = new Set(getVisibleBookPieces(bookState));
  const visibleLayouts = layout.pieceLayouts.filter(({ piece }) => visiblePieces.has(piece));
  return findTopmostControlAtPoint(visibleLayouts, canvasX, canvasY)?.piece ?? null;
}

export function beginBookPieceDrag(bookState:BookState, canvasX:number, canvasY:number):boolean {
  if (bookState.pieceDragState !== null) return false;
  const piece = findBookPieceAtPoint(bookState, canvasX, canvasY);
  if (piece === null) return false;
  const { layout } = bookState;
  assertNonNullable(layout);
  const record = layout.pieceLayouts.find(candidate => candidate.piece === piece);
  assertNonNullable(record);

  bookState.pieceDragState = { piece, grabOffset:calcDragGrabOffset(record.rect, canvasX, canvasY) };
  bringBookPieceToFront(bookState, piece);
  return true;
}

export function endBookPieceDrag(bookState:BookState):void {
  bookState.pieceDragState = null;
}

export function moveBookPieceDrag(bookState:BookState, canvasX:number, canvasY:number):void {
  const { pieceDragState, layout } = bookState;
  if (pieceDragState === null) return;
  if (!bookState.isVisible || bookState.animationKind !== null || !layout
    || layout.pieceLayoutsPageNo !== bookState.pageNo
    || !getVisibleBookPieces(bookState).includes(pieceDragState.piece)) return endBookPieceDrag(bookState);
  const record = layout.pieceLayouts.find(candidate => candidate.piece === pieceDragState.piece && candidate.isVisible);
  if (!record) return endBookPieceDrag(bookState);

  const bounds = { ...layout.rect, x:layout.rect.x + calcPageViewOffsetX(bookState) };
  assert(bounds.width > 0 && bounds.height > 0);
  const [centerX, centerY] = calcClampedDragCenter(pieceDragState.grabOffset, bounds, canvasX, canvasY);
  pieceDragState.piece.xPercent = (centerX - bounds.x) / bounds.width * 100;
  pieceDragState.piece.yPercent = (centerY - bounds.y) / bounds.height * 100;
  record.rect = { ...record.rect, x:centerX - record.rect.width / 2, y:centerY - record.rect.height / 2 };
}