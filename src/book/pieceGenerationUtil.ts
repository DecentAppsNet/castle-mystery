/* This file generates loose book pieces from conclusion-scoped answer groups without drawing or changing source data.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import ClozeBlank from '@/game/conclusions/types/ClozeBlank';
import { assert, assertNonNullable } from 'decent-portal';
import BookState from './types/BookState';
import Piece from './types/Piece';

// Piece centers leave room for half a piece above/below, clear of the heading and page number.
const FIRST_ROW_Y_PERCENT = 14;
const LAST_ROW_Y_PERCENT = 86;
const PREFERRED_ROW_SPACING_PERCENT = 5;

function _haveSameMembership(first:readonly string[], second:readonly string[]):boolean {
  if (first === second) return true;
  return first.every(answer => second.includes(answer)) && second.every(answer => first.includes(answer));
}

function _placeAnswerGroupsOnRightPage(answerGroups:readonly Piece[][]):void {
  if (answerGroups.length === 0) return;

  // Count group separators as placement slots and choose up to three fixed columns.
  const placementCount = answerGroups.reduce((count, group) => count + group.length, 0) + answerGroups.length - 1;
  const usableHeightPercent = LAST_ROW_Y_PERCENT - FIRST_ROW_Y_PERCENT;
  const preferredHeightPercent = placementCount * PREFERRED_ROW_SPACING_PERCENT;
  const columnCount = preferredHeightPercent < usableHeightPercent ? 1
    : preferredHeightPercent / 2 < usableHeightPercent ? 2 : 3;
  const rowsPerColumn = Math.ceil(placementCount / columnCount);
  const rowSpacingPercent = Math.min(PREFERRED_ROW_SPACING_PERCENT,
    usableHeightPercent / Math.max(1, rowsPerColumn - 1));

  // Separate groups only within a column; a column break already provides separation.
  let placementIndex = 0;
  for (const group of answerGroups) {
    if (placementIndex % rowsPerColumn !== 0) placementIndex++;
    for (const piece of group) {
      const columnIndex = Math.floor(placementIndex / rowsPerColumn);
      piece.xPercent = 50 + (columnIndex + .5) * 50 / columnCount;
      piece.yPercent = FIRST_ROW_Y_PERCENT + (placementIndex % rowsPerColumn) * rowSpacingPercent;
      placementIndex++;
    }
  }
}

export function generatePieceStack(bookState:Readonly<BookState>):Piece[] {
  // Keep inventory grouping local while consuming each page's shared style lookup.
  const pieces:Piece[] = [];
  const groups:{ readonly conclusionId:string, readonly answers:readonly string[] }[] = [];

  // Validate each conclusion spread and collect its new groups before positioning them.
  bookState.pages.forEach((page, pageI) => {
    if (page.kind !== 'conclusion') return;
    assert(pageI % 2 === 0, 'Conclusion pages must be on the left.');
    assert(bookState.pages[pageI + 1]?.kind === 'blank', 'Conclusion pages must have a blank right page.');
    const conclusionId = page.conclusion.id;
    const answerGroups:Piece[][] = [];
    for (const part of page.conclusion.parts) {
      if (part.type !== 'blank') continue;
      const { answerSet } = part as ClozeBlank;
      const { answers } = answerSet;
      const styleNo:number | undefined = page.answerSetIdToPieceStyleNoMap[answerSet.id];
      assertNonNullable(styleNo);
      if (groups.some(group => group.conclusionId === conclusionId && _haveSameMembership(group.answers, answers))) continue;

      // Emit each new group's answers in their original order with fresh mutable pieces.
      groups.push({ conclusionId, answers });
      const groupPieces = answers.map(text => ({ conclusionId, styleNo, text, xPercent:0, yPercent:0 }));
      if (groupPieces.length > 0) answerGroups.push(groupPieces);
      pieces.push(...groupPieces);
    }
    _placeAnswerGroupsOnRightPage(answerGroups);
  });
  return pieces;
}