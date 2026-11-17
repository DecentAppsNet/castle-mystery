/* This file generates loose book pieces from conclusion-scoped answer groups without drawing or changing source data.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import ClozeBlank from '@/game/conclusions/types/ClozeBlank';
import BookState from './types/BookState';
import Piece from './types/Piece';

function _haveSameMembership(first:readonly string[], second:readonly string[]):boolean {
  if (first === second) return true;
  return first.every(answer => second.includes(answer)) && second.every(answer => first.includes(answer));
}

export function generatePieceStack(bookState:Readonly<BookState>):Piece[] {
  // Keep grouping and style assignment local to this inventory generation.
  const pieces:Piece[] = [];
  const groups:{ readonly conclusionId:string, readonly answers:readonly string[] }[] = [];
  let nextStyleNo = 0;

  // Traverse actual page positions, resetting only temporary vertical placement.
  bookState.pages.forEach((page, pageI) => {
    if (page.kind !== 'conclusion') return;
    const conclusionId = page.conclusion.id;
    const xPercent = pageI % 2 === 0 ? 25 : 75;
    let yPercent = 5;
    for (const part of page.conclusion.parts) {
      if (part.type !== 'blank') continue;
      const answers = (part as ClozeBlank).availableAnswers;
      if (groups.some(group => group.conclusionId === conclusionId && _haveSameMembership(group.answers, answers))) continue;

      // Emit each new group's answers in their original order with fresh mutable pieces.
      groups.push({ conclusionId, answers });
      const styleNo = nextStyleNo++;
      for (const text of answers) {
        pieces.push({ conclusionId, styleNo, text, xPercent, yPercent });
        yPercent += 5;
      }
    }
  });
  return pieces;
}