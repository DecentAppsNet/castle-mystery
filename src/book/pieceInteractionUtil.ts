/* This file manages loose-piece stacking and lookup using book content and prepared canvas layout records.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { findTopmostControlAtPoint } from "@/canvasControls";
import { assert } from "decent-portal";
import { isLeftPageNo } from "./drawing/bookLayoutUtil";
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