/* This file generates each category's loose-piece inventory once per conclusion page without changing source data.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import ClozeBlank from '@/conclusions/types/ClozeBlank';
import { assert, assertNonNullable } from 'decent-portal';
import BookState from '../types/BookState';
import Piece from '../types/Piece';
import { IDENTITIES_PER_PAGE } from '../identityLayoutConstants';

// Piece centers leave room for half a piece above/below, clear of the heading and page number.
const FIRST_ROW_Y_PERCENT = 14;
const LAST_ROW_Y_PERCENT = 86;
const PREFERRED_ROW_SPACING_PERCENT = 5;
const SECOND_COLUMN_INITIAL_PIECE_X_OFFSET_PERCENT = 15;

function _placeAnswerGroupsOnRightPage(answerGroups:readonly Piece[][], xOffsetPercent:number):void {
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
      piece.xPercent = 50 + (columnIndex + .5) * 50 / columnCount + xOffsetPercent;
      piece.yPercent = FIRST_ROW_Y_PERCENT + (placementIndex % rowsPerColumn) * rowSpacingPercent;
      placementIndex++;
    }
  }
}

function _generatePieceStack(bookState:Readonly<BookState>, newPagesStartIndex:number):Piece[] {
  assert(Number.isInteger(newPagesStartIndex) && newPagesStartIndex >= 0 && newPagesStartIndex <= bookState.pages.length);
  // Keep inventory grouping local while consuming each page's shared style lookup.
  const pieces:Piece[] = [];

  // Validate each conclusion spread and collect its new groups before positioning them.
  for (let pageI = newPagesStartIndex; pageI < bookState.pages.length; ++pageI) {
    const page = bookState.pages[pageI];
    if (page.kind !== 'conclusion') continue;
    assert(pageI % 2 === 0, 'Conclusion pages must be on the left.');
    assert(bookState.pages[pageI + 1]?.kind === 'blank', 'Conclusion pages must have a blank right page.');
    const answerGroups:Piece[][] = [];
    const emittedCategoryIds = new Set<string>();
    for (const part of page.conclusion.parts) {
      if (part.type !== 'blank') continue;
      const { answerSet } = part as ClozeBlank;
      const { answers } = answerSet;
      const styleNo:number | undefined = page.answerSetIdToPieceStyleNoMap[answerSet.id];
      assertNonNullable(styleNo);
      if (emittedCategoryIds.has(answerSet.id)) continue;

      // Emit each category's ordered answers once; category validation guarantees disjoint membership.
      emittedCategoryIds.add(answerSet.id);
      const groupPieces:Piece[] = answers.map(text => ({ conclusionPageI:pageI, styleNo, text, xPercent:0, yPercent:0, placement:null }));
      if (groupPieces.length > 0) answerGroups.push(groupPieces);
      pieces.push(...groupPieces);
    }
    const identityCount = page.conclusion.parts.filter(part => part.type === 'image').length;
    const xOffsetPercent = page.conclusion.id === 'identities' && identityCount > IDENTITIES_PER_PAGE
      ? SECOND_COLUMN_INITIAL_PIECE_X_OFFSET_PERCENT : 0;
    _placeAnswerGroupsOnRightPage(answerGroups, xOffsetPercent);

    // Associate prefilled blanks without changing their answers or the generated inventory order.
    for (const part of page.conclusion.parts) {
      if (part.type !== 'blank') continue;
      const blank = part as ClozeBlank;
      if (blank.playerAnswerIndex === -1) continue;
      const matches = answerGroups.flat().filter(piece => piece.styleNo === page.answerSetIdToPieceStyleNoMap[blank.answerSet.id]
        && piece.text === blank.answerSet.answers[blank.playerAnswerIndex]);
      assert(matches.length === 1 && matches[0].placement === null, 'Initial piece placement must be unambiguous.');
      matches[0].placement = { page, blank };
    }
  }
  return pieces;
}

export function updatePieceStackForConclusionPages(bookState:BookState, newPagesStartIndex:number):void {
  bookState.pieceStack.push(..._generatePieceStack(bookState, newPagesStartIndex));
}