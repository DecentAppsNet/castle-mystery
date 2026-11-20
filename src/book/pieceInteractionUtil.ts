/* This file manages loose-piece stacking, lookup, and dragging using book content and prepared canvas layout records.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { calcClampedDragCenter, calcDragGrabOffset, findTopmostControlAtPoint } from "@/canvasControls";
import { assert, assertNonNullable } from "decent-portal";
import { calcPageViewOffsetX, isLeftPageNo } from "./drawing/bookLayoutUtil";
import BookState from "./types/BookState";
import Piece from "./types/Piece";
import { findPieceSlotAnswerIndex, isCurrentPieceSlot, updateBookPieceSlotTarget } from "./pieceSlotTargetUtil";
import { isPositionInRect } from '@/game/rectUtil';
import PieceLayout from './drawing/types/PieceLayout';

export function getVisibleBookPieces(bookState:Readonly<BookState>):Piece[] {
  const leftPageNo = isLeftPageNo(bookState.pageNo) ? bookState.pageNo : bookState.pageNo - 1;
  const visibleConclusionIds = new Set(bookState.pages.slice(leftPageNo - 1, leftPageNo + 1)
    .flatMap(page => page.kind === 'conclusion' ? [page.conclusion.id] : []));
  return bookState.pieceStack.filter(piece => piece.placement === null && visibleConclusionIds.has(piece.conclusionId));
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

function _extractBookPieceAtPoint(bookState:BookState, canvasX:number, canvasY:number):PieceLayout|null {
  // Validate normal slot geometry and actual content before changing either side of the placement.
  const { layout } = bookState;
  assertNonNullable(layout);
  const slot = layout.pieceSlotLayouts.find(candidate => candidate.blank.playerAnswerIndex !== -1
    && isCurrentPieceSlot(bookState, candidate, layout.isSinglePageView) && isPositionInRect(canvasX, canvasY, candidate.rect));
  if (!slot) return null;
  const piece = bookState.pieceStack.find(candidate => candidate.placement?.page === slot.page && candidate.placement.blank === slot.blank);
  assertNonNullable(piece);
  assert(findPieceSlotAnswerIndex(slot, piece) === slot.blank.playerAnswerIndex);

  // Detach the answer and place the exact inventory piece at the full slot's normal rectangle.
  slot.blank.playerAnswerIndex = -1;
  piece.placement = null;
  const bounds = { ...layout.rect, x:layout.rect.x + calcPageViewOffsetX(bookState) };
  piece.xPercent = (slot.rect.x + slot.rect.width / 2 - bounds.x) / bounds.width * 100;
  piece.yPercent = (slot.rect.y + slot.rect.height / 2 - bounds.y) / bounds.height * 100;
  const record = { piece, rect:{ ...slot.rect }, metrics:slot.metrics, isVisible:true };
  layout.pieceLayouts = [...layout.pieceLayouts.filter(candidate => candidate.piece !== piece), record];
  return record;
}

export function beginBookPieceDrag(bookState:BookState, canvasX:number, canvasY:number):boolean {
  // Loose pieces overlay full slots; only extract when no loose piece was hit.
  const { layout } = bookState;
  if (bookState.pieceDragState !== null || !bookState.isVisible || bookState.animationKind !== null
    || !layout || layout.pieceLayoutsPageNo !== bookState.pageNo) return false;
  const loosePiece = findBookPieceAtPoint(bookState, canvasX, canvasY);
  const extractedLayout = loosePiece === null ? _extractBookPieceAtPoint(bookState, canvasX, canvasY) : null;
  const piece = loosePiece ?? extractedLayout?.piece ?? null;
  if (piece === null) return false;
  const record = layout.pieceLayouts.find(candidate => candidate.piece === piece);
  assertNonNullable(record);

  // Preserve the grab point and the extracted slot's dimensions across subsequent redraws.
  const extractedAppearance = extractedLayout === null ? null : {
    height:extractedLayout.rect.height, metrics:extractedLayout.metrics
  };
  bookState.pieceDragState = { piece, grabOffset:calcDragGrabOffset(record.rect, canvasX, canvasY), extractedAppearance };
  bringBookPieceToFront(bookState, piece);
  updateBookPieceSlotTarget(bookState);
  return true;
}

export function endBookPieceDrag(bookState:BookState):void {
  bookState.pieceDragState = null;
  bookState.hungryPieceSlot = null;
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
  updateBookPieceSlotTarget(bookState);
}

export function releaseBookPieceDrag(bookState:BookState, canvasX:number, canvasY:number):void {
  // Movement validates the drag and resolves the shared target at the final release position.
  moveBookPieceDrag(bookState, canvasX, canvasY);
  const { pieceDragState, hungryPieceSlot } = bookState;
  if (pieceDragState !== null && hungryPieceSlot !== null) {
    const answerIndex = findPieceSlotAnswerIndex(hungryPieceSlot, pieceDragState.piece);
    assert(answerIndex !== -1); // The shared selector guarantees listed membership.
    hungryPieceSlot.blank.playerAnswerIndex = answerIndex;
    pieceDragState.piece.placement = { page:hungryPieceSlot.page, blank:hungryPieceSlot.blank };
    bookState.pieceSlotTransitions = bookState.pieceSlotTransitions.filter(({ slot }) =>
      slot.page !== hungryPieceSlot.page || slot.blank !== hungryPieceSlot.blank);
  }

  // Cancellation stays assignment-free and may safely run again during listener cleanup.
  endBookPieceDrag(bookState);
}