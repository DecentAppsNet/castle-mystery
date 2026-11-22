/* This file derives eligible book blanks and selects the nearest overlapping slot for an active piece drag.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { normalizeCategoryPhrase } from '@/game/conclusions/conclusionUtil';
import { doRectsOverlap } from '@/game/rectUtil';
import { isLeftPageNo } from '../drawing/bookLayoutUtil';
import PieceSlotLayout from '../drawing/types/PieceSlotLayout';
import { endBookPieceDrag, getVisibleBookPieces } from './pieceInteractionUtil';
import BookState from '../types/BookState';
import Piece from '../types/Piece';

export function isCurrentPieceSlot(bookState:Readonly<BookState>, slot:PieceSlotLayout, isSinglePageView:boolean):boolean {
  // Reject hidden pages and obsolete page/part references before checking their mutable state.
  const { page, pageNo, partIndex, blank, styleNo } = slot;
  const leftPageNo = isLeftPageNo(bookState.pageNo) ? bookState.pageNo : bookState.pageNo - 1;
  const isDisplayed = isSinglePageView ? pageNo === bookState.pageNo : pageNo === leftPageNo || pageNo === leftPageNo + 1;
  if (!isDisplayed || bookState.pages[pageNo - 1] !== page || page.conclusion.parts[partIndex] !== blank) return false;

  // Both full and empty slots may be interactive, but never locked or completed conclusions.
  return !page.conclusion.isLocked && !page.conclusion.isComplete
    && page.answerSetIdToPieceStyleNoMap[blank.answerSet.id] === styleNo;
}

export function isCurrentEmptyPieceSlot(bookState:Readonly<BookState>, slot:PieceSlotLayout, isSinglePageView:boolean):boolean {
  return slot.blank.playerAnswerIndex === -1 && isCurrentPieceSlot(bookState, slot, isSinglePageView);
}

export function findPieceSlotAnswerIndex(slot:PieceSlotLayout, piece:Piece):number {
  return slot.blank.answerSet.answers.findIndex(answer => normalizeCategoryPhrase(answer) === normalizeCategoryPhrase(piece.text));
}

function _isEligible(bookState:Readonly<BookState>, slot:PieceSlotLayout, piece:Piece, isSinglePageView:boolean):boolean {
  const { pageNo, styleNo } = slot;
  return isCurrentEmptyPieceSlot(bookState, slot, isSinglePageView)
    && pageNo - 1 === piece.conclusionPageI && styleNo === piece.styleNo
    && findPieceSlotAnswerIndex(slot, piece) !== -1;
}

export function updateBookPieceSlotTarget(bookState:BookState):ReadonlyArray<PieceSlotLayout> {
  // Validate the active drag against the most recently prepared normal geometry.
  bookState.hungryPieceSlot = null;
  const { layout, pieceDragState } = bookState;
  if (pieceDragState === null) return [];
  if (!bookState.isVisible || bookState.animationKind !== null || !layout
    || layout.pieceLayoutsPageNo !== bookState.pageNo
    || !getVisibleBookPieces(bookState).includes(pieceDragState.piece)) {
    endBookPieceDrag(bookState);
    return [];
  }
  const pieceLayout = layout.pieceLayouts.find(record => record.piece === pieceDragState.piece && record.isVisible);
  if (!pieceLayout) {
    endBookPieceDrag(bookState);
    return [];
  }

  // Derive candidates once, sorting ties by page/part rather than prepared-record order.
  const eligible = layout.pieceSlotLayouts.filter(slot => _isEligible(bookState, slot, pieceDragState.piece, layout.isSinglePageView))
    .sort((first, second) => first.pageNo - second.pageNo || first.partIndex - second.partIndex);
  let nearestDistance = Infinity;
  const pieceRect = pieceLayout.rect;
  for (const slot of eligible) {
    if (!doRectsOverlap(slot.rect, pieceRect)) continue;
    const dx = slot.rect.x + slot.rect.width / 2 - pieceRect.x - pieceRect.width / 2;
    const dy = slot.rect.y + slot.rect.height / 2 - pieceRect.y - pieceRect.height / 2;
    const distance = dx * dx + dy * dy;
    if (distance >= nearestDistance) continue;
    nearestDistance = distance;
    bookState.hungryPieceSlot = slot;
  }
  return eligible;
}