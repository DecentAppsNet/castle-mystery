/* This file manages loose-piece stacking, lookup, and dragging using book content and prepared canvas layout records.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { calcClampedDragCenter, calcDragGrabOffset, findTopmostControlAtPoint } from "@/canvasControls";
import { assert, assertNonNullable } from "decent-portal";
import { calcPageRect, calcPageViewOffsetX, isLeftPageNo } from "../drawing/bookLayoutUtil";
import BookState from "../types/BookState";
import Piece from "../types/Piece";
import { findPieceSlotAnswerIndex, isCurrentPieceSlot, updateBookPieceSlotTarget } from "./pieceSlotTargetUtil";
import { isPositionInRect } from '@/game/rectUtil';
import PieceLayout from '../drawing/types/PieceLayout';
import PieceSlotLayout from '../drawing/types/PieceSlotLayout';

export function getVisibleBookPieces(bookState:Readonly<BookState>):Piece[] {
  const leftPageNo = isLeftPageNo(bookState.pageNo) ? bookState.pageNo : bookState.pageNo - 1;
  return bookState.pieceStack.filter(piece => {
    const { pageI } = piece;
    const isInSpread = pageI === leftPageNo - 1 || pageI === leftPageNo;
    if (piece.kind === 'note') return bookState.layout?.isSinglePageView ? pageI === bookState.pageNo - 1 : isInSpread;
    const page = bookState.pages[pageI];
    return isInSpread && piece.placement === null && page?.kind === 'conclusion' && !page.conclusion.isLocked;
  });
}

export function bringBookPieceToFront(bookState:BookState, piece:Piece):boolean {
  const visiblePieces = getVisibleBookPieces(bookState);
  assert(visiblePieces.includes(piece));
  const isReordered = bookState.pieceStack.at(-1) !== piece;
  if (isReordered) bookState.pieceStack = [...bookState.pieceStack.filter(candidate => candidate !== piece), piece];

  const { layout } = bookState;
  if (layout) {
    layout.pieceLayouts = layout.pieceLayouts.filter(record => visiblePieces.includes(record.piece))
      .sort((first, second) => bookState.pieceStack.indexOf(first.piece) - bookState.pieceStack.indexOf(second.piece));
  }
  return isReordered;
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
  return _detachBookPiece(bookState, slot, _findPlacedPiece(bookState, slot), offsetX, offsetY);
}

function _findPlacedPiece(bookState:BookState, slot:PieceSlotLayout) {
  // Resolve the exact placed piece before clearing either side of the association.
  const piece = bookState.pieceStack.find(candidate => candidate.kind === 'answer'
    && candidate.placement?.page === slot.page && candidate.placement.blank === slot.blank);
  assertNonNullable(piece);
  assert(piece.kind === 'answer');
  assert(findPieceSlotAnswerIndex(slot, piece) === slot.blank.playerAnswerIndex);
  return piece;
}

function _detachBookPiece(bookState:BookState, slot:PieceSlotLayout, piece:Extract<Piece, { kind:'answer' }>,
  offsetX:number = 0, offsetY:number = 0):PieceLayout {
  const { layout } = bookState;
  assertNonNullable(layout);
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

function _findOccupiedSlotAtPoint(bookState:BookState, canvasX:number, canvasY:number) {
  const { layout } = bookState;
  assertNonNullable(layout);
  return layout.pieceSlotLayouts.find(candidate => candidate.blank.playerAnswerIndex !== -1
    && isCurrentPieceSlot(bookState, candidate, layout.isSinglePageView) && isPositionInRect(canvasX, canvasY, candidate.rect));
}

export function beginBookPieceDrag(bookState:BookState, canvasX:number, canvasY:number):boolean {
  // Loose pieces overlay full slots; only extract when no loose piece was hit.
  const { layout } = bookState;
  if (bookState.pieceDragState !== null || !bookState.isVisible || bookState.animationKind !== null
    || !layout || layout.pieceLayoutsPageNo !== bookState.pageNo) return false;
  const loosePiece = findBookPieceAtPoint(bookState, canvasX, canvasY);
  const slot = loosePiece === null ? _findOccupiedSlotAtPoint(bookState, canvasX, canvasY) : undefined;
  const placedPiece = slot ? _findPlacedPiece(bookState, slot) : null;
  const piece = loosePiece ?? placedPiece;
  if (piece === null) return false;
  const initialPiece = { ...piece };
  const initialStackI = bookState.pieceStack.indexOf(piece);
  const extractedLayout = slot && placedPiece ? _detachBookPiece(bookState, slot, placedPiece) : null;
  const record = layout.pieceLayouts.find(candidate => candidate.piece === piece);
  assertNonNullable(record);

  // Preserve the grab point and the extracted slot's dimensions across subsequent redraws.
  const extractedAppearance = extractedLayout === null ? null : {
    height:extractedLayout.rect.height, metrics:extractedLayout.metrics
  };
  bookState.pieceDragState = { piece, initialPiece, initialStackI,
    grabOffset:calcDragGrabOffset(record.rect, canvasX, canvasY), extractedAppearance };
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

  const spread = { ...layout.rect, x:layout.rect.x + calcPageViewOffsetX(bookState) };
  const { piece } = pieceDragState;
  assert(spread.width > 0 && spread.height > 0);
  const [centerX, centerY] = calcClampedDragCenter(pieceDragState.grabOffset, spread, canvasX, canvasY);
  if (piece.kind === 'note' && !layout.isSinglePageView) {
    const leftPageI = isLeftPageNo(bookState.pageNo) ? bookState.pageNo - 1 : bookState.pageNo - 2;
    const targetPageI = centerX < spread.x + spread.width / 2 ? leftPageI : leftPageI + 1;
    if (bookState.pages[targetPageI]) piece.pageI = targetPageI;
  }
  const bounds = piece.kind === 'note' ? calcPageRect(spread, piece.pageI + 1) : spread;
  piece.xPercent = (centerX - bounds.x) / bounds.width * 100;
  piece.yPercent = (centerY - bounds.y) / bounds.height * 100;
  record.rect = { ...record.rect, x:centerX - record.rect.width / 2, y:centerY - record.rect.height / 2 };
  updateBookPieceSlotTarget(bookState);
}

export function releaseBookPieceDrag(bookState:BookState, canvasX:number, canvasY:number):boolean {
  // Movement validates the drag and resolves the shared target at the final release position.
  moveBookPieceDrag(bookState, canvasX, canvasY);
  const { pieceDragState, hungryPieceSlot } = bookState;
  if (pieceDragState?.piece.kind === 'answer' && hungryPieceSlot !== null) {
    const answerIndex = findPieceSlotAnswerIndex(hungryPieceSlot, pieceDragState.piece);
    assert(answerIndex !== -1); // The shared selector guarantees listed membership.
    hungryPieceSlot.blank.playerAnswerIndex = answerIndex;
    pieceDragState.piece.placement = { page:hungryPieceSlot.page, blank:hungryPieceSlot.blank };
    bookState.pieceSlotTransitions = bookState.pieceSlotTransitions.filter(({ slot }) =>
      slot.page !== hungryPieceSlot.page || slot.blank !== hungryPieceSlot.blank);
  }

  // Cancellation stays assignment-free and may safely run again during listener cleanup.
  endBookPieceDrag(bookState);
  if (pieceDragState === null) return false;
  const { piece, initialPiece, initialStackI } = pieceDragState;
  const stackChanged = initialStackI !== bookState.pieceStack.indexOf(piece);
  const pageChanged = piece.pageI !== initialPiece.pageI;
  const positionTolerancePercent = 1e-10;
  const xChanged = Math.abs(piece.xPercent - initialPiece.xPercent) > positionTolerancePercent;
  const yChanged = Math.abs(piece.yPercent - initialPiece.yPercent) > positionTolerancePercent;
  if (stackChanged || pageChanged || xChanged || yChanged) return true;

  if (piece.kind !== 'answer' || initialPiece.kind !== 'answer') return false;
  return piece.placement?.page !== initialPiece.placement?.page
    || piece.placement?.blank !== initialPiece.placement?.blank;
}