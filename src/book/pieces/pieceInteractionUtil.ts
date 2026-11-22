/* This file manages loose-piece stacking, lookup, and dragging using book content and prepared canvas layout records.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { calcClampedDragCenter, calcDragGrabOffset, findTopmostControlAtPoint } from "@/canvasControls";
import { assert, assertNonNullable } from "decent-portal";
import { calcPageViewOffsetX, isLeftPageNo } from "../drawing/bookLayoutUtil";
import BookState from "../types/BookState";
import Piece from "../types/Piece";
import { findPieceSlotAnswerIndex, isCurrentPieceSlot, updateBookPieceSlotTarget } from "./pieceSlotTargetUtil";
import { isPositionInRect } from '@/game/rectUtil';
import PieceLayout from '../drawing/types/PieceLayout';
import PieceSlotLayout from '../drawing/types/PieceSlotLayout';

export function getVisibleBookPieces(bookState:Readonly<BookState>):Piece[] {
  const leftPageNo = isLeftPageNo(bookState.pageNo) ? bookState.pageNo : bookState.pageNo - 1;
  return bookState.pieceStack.filter(piece => {
    const page = bookState.pages[piece.conclusionPageI];
    return piece.placement === null
      && (piece.conclusionPageI === leftPageNo - 1 || piece.conclusionPageI === leftPageNo)
      && page?.kind === 'conclusion' && !page.conclusion.isLocked;
  });
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

export function detachBookPiece(bookState:BookState, slot:PieceSlotLayout, offsetX:number = 0, offsetY:number = 0):PieceLayout {
  // Resolve the exact placed piece before clearing either side of the association.
  const { layout } = bookState;
  assertNonNullable(layout);
  const piece = bookState.pieceStack.find(candidate => candidate.placement?.page === slot.page && candidate.placement.blank === slot.blank);
  assertNonNullable(piece);
  assert(findPieceSlotAnswerIndex(slot, piece) === slot.blank.playerAnswerIndex);

  // Retain full-slot geometry for immediate interaction, optionally displaced for ejection.
  slot.blank.playerAnswerIndex = -1;
  piece.placement = null;
  const bounds = { ...layout.rect, x:layout.rect.x + calcPageViewOffsetX(bookState) };
  piece.xPercent = (slot.rect.x + slot.rect.width / 2 + offsetX - bounds.x) / bounds.width * 100;
  piece.yPercent = (slot.rect.y + slot.rect.height / 2 + offsetY - bounds.y) / bounds.height * 100;
  const record = { piece, rect:{ ...slot.rect, x:slot.rect.x + offsetX, y:slot.rect.y + offsetY }, metrics:slot.metrics, isVisible:true };
  layout.pieceLayouts = [...layout.pieceLayouts.filter(candidate => candidate.piece !== piece), record];
  layout.pieceLayouts = [...layout.pieceLayouts].sort((a, b) => bookState.pieceStack.indexOf(a.piece) - bookState.pieceStack.indexOf(b.piece));
  return record;
}

function _extractBookPieceAtPoint(bookState:BookState, canvasX:number, canvasY:number):PieceLayout|null {
  const { layout } = bookState;
  assertNonNullable(layout);
  const slot = layout.pieceSlotLayouts.find(candidate => candidate.blank.playerAnswerIndex !== -1
    && isCurrentPieceSlot(bookState, candidate, layout.isSinglePageView) && isPositionInRect(canvasX, canvasY, candidate.rect));
  return slot ? detachBookPiece(bookState, slot) : null;
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