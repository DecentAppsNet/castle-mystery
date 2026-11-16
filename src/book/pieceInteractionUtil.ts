/* This file provides book-specific loose-piece lookup using prepared canvas layout records.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { findTopmostControlAtPoint } from "@/canvasControls";
import { isLeftPageNo } from "./drawing/bookLayoutUtil";
import BookState from "./types/BookState";
import Piece from "./types/Piece";

export function findBookPieceAtPoint(bookState:Readonly<BookState>, canvasX:number, canvasY:number):Piece|null {
  const { layout } = bookState;
  if (!bookState.isVisible || bookState.animationKind !== null || !layout
    || layout.pieceLayoutsPageNo !== bookState.pageNo) return null;

  // Reject obsolete references even if the selected page number has not changed.
  const leftPageNo = isLeftPageNo(bookState.pageNo) ? bookState.pageNo : bookState.pageNo - 1;
  const visiblePages = bookState.pages.slice(leftPageNo - 1, leftPageNo + 1);
  const visibleLayouts = layout.pieceLayouts.filter(({ piece }) => visiblePages.some(page =>
    page.kind === 'conclusion' && page.pieces.includes(piece)));
  return findTopmostControlAtPoint(visibleLayouts, canvasX, canvasY)?.piece ?? null;
}