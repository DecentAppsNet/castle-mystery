/* This file derives loose-piece background colors from conclusion-scoped slot fullness.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assertNonNullable } from 'decent-portal';
import ClozeBlank from '@/game/conclusions/types/ClozeBlank';
import { getPieceFlairProfile } from './pieceFlairUtil';
import BookState from './types/BookState';
import BookPage from './types/BookPage';
import Piece from './types/Piece';

export function getBookPieceBackgroundColor(bookState:Readonly<BookState>, piece:Readonly<Piece>):string {
  // Resolve styles within their owning conclusion, independently of visible layout records.
  const page = bookState.pages.find((page):page is Extract<BookPage, { kind:'conclusion' }> =>
    page.kind === 'conclusion' && page.conclusion.id === piece.conclusionId);
  assertNonNullable(page);
  const blanks = page.conclusion.parts
    .filter((part):part is ClozeBlank => part.type === 'blank')
    .filter(blank => page.answerSetIdToPieceStyleNoMap[blank.answerSet.id] === piece.styleNo);

  // Derive fullness each frame so extracting an answer immediately restores the style color.
  return blanks.length > 0 && blanks.every(blank => blank.playerAnswerIndex !== -1)
    ? '#808080' : getPieceFlairProfile(piece.styleNo).pieceColor;
}