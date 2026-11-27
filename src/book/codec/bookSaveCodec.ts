/* This file converts durable book state and its ordered piece stack to and from snapshots.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assert } from 'decent-portal';
import { normalizeCategoryPhrase } from '@/conclusions';
import ClozeBlank, { UNSPECIFIED_ANSWER } from '@/conclusions/types/ClozeBlank';
import BookSaveState from '@/persistence/types/BookSaveState';
import SavedBookPiece from '@/persistence/types/SavedBookPiece';
import { decodeBookPages, encodeBookPages } from './bookPageSaveCodec';
import BookPage from '../types/BookPage';
import BookState, { createDefaultBookState } from '../types/BookState';
import Piece from '../types/Piece';

function _encodePiece(piece:Piece, pages:readonly BookPage[]):SavedBookPiece {
  const { kind, pageI, styleNo, text, xPercent, yPercent } = piece;
  const base = { pageI, styleNo, text, xPercent, yPercent };
  if (kind === 'note') return { ...base, kind };
  if (piece.placement === null) return { ...base, kind, placement:null };
  const { page, blank } = piece.placement;
  const partI = page.conclusion.parts.indexOf(blank);
  assert(pages[pageI] === page && partI >= 0, 'Book piece placement must point to a blank on its owner page.');
  return { ...base, kind, placement:{ pageI, partI } };
}

export function encodeBookSaveState(book:Readonly<BookState>):BookSaveState {
  return { version:1, pageNo:book.pageNo, levelUrls:[...book.levelUrls], pages:encodeBookPages(book.pages),
    pieceStack:book.pieceStack.map(piece => _encodePiece(piece, book.pages)) };
}

function _decodePiece(saved:SavedBookPiece, pages:readonly BookPage[], occupied:Set<ClozeBlank>):Piece|null {
  const { kind, pageI, styleNo, text, xPercent, yPercent } = saved;
  const page = pages[pageI];
  if (!page) return null;
  const base = { pageI, styleNo, text, xPercent, yPercent };
  if (kind === 'note') return { ...base, kind };
  if (page.kind !== 'conclusion') return null;
  if (saved.placement === null) return { ...base, kind, placement:null };
  if (saved.placement.pageI !== pageI) return null;
  const part = page.conclusion.parts[saved.placement.partI];
  if (part?.type !== 'blank') return null;
  const blank = part as ClozeBlank;
  const answer = blank.answerSet.answers[blank.playerAnswerIndex];
  if (occupied.has(blank) || answer === undefined || page.answerSetIdToPieceStyleNoMap[blank.answerSet.id] !== styleNo
    || normalizeCategoryPhrase(answer) !== normalizeCategoryPhrase(text)) return null;
  occupied.add(blank);
  return { ...base, kind, placement:{ page, blank } };
}

function _decodePieceStack(savedStack:readonly SavedBookPiece[], pages:readonly BookPage[]):Piece[]|null {
  const occupied = new Set<ClozeBlank>();
  const pieceStack:Piece[] = [];
  for (const saved of savedStack) {
    const piece = _decodePiece(saved, pages, occupied);
    if (!piece) return null;
    pieceStack.push(piece);
  }
  for (const page of pages) {
    if (page.kind !== 'conclusion') continue;
    for (const part of page.conclusion.parts) {
      if (part.type !== 'blank') continue;
      const blank = part as ClozeBlank;
      if (blank.playerAnswerIndex !== UNSPECIFIED_ANSWER && !occupied.has(blank)) return null;
    }
  }
  return pieceStack;
}

export function decodeBookSaveState(save:BookSaveState):BookState|null {
  const { pageNo, levelUrls } = save;
  if (!Number.isInteger(pageNo) || pageNo < 1 || pageNo > save.pages.length || levelUrls.length === 0) return null;
  const pages = decodeBookPages(save.pages);
  if (!pages) return null;
  const pieceStack = _decodePieceStack(save.pieceStack, pages);
  if (!pieceStack) return null;
  return { ...createDefaultBookState(), pageNo, levelUrls:[...levelUrls], pages, pieceStack };
}