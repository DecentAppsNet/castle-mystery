import { describe, expect, it } from 'vitest';
import { decodeBookSaveState, encodeBookSaveState } from '../bookSaveCodec';
import { createDefaultBookState } from '../types/BookState';
import ConclusionPage from '../types/ConclusionPage';
import Piece from '../types/Piece';
import { bookSnapshot } from './fixtures/bookSnapshot';

type AnswerPiece = Extract<Piece, { kind:'answer' }>;

function _restoreFixture() {
  const book = decodeBookSaveState(bookSnapshot);
  expect(book).not.toBeNull();
  return book!;
}

describe('bookSaveCodec', () => {
  it('round-trips durable fields, piece order and coordinates through JSON', () => {
    const original = _restoreFixture();
    const snapshot = encodeBookSaveState(original);
    expect(snapshot).toEqual(bookSnapshot);
    const restored = decodeBookSaveState(JSON.parse(JSON.stringify(snapshot)));
    expect(restored).toEqual(original);
    expect(restored?.levelUrls).not.toBe(original.levelUrls);
    expect(restored?.pieceStack[0]).not.toBe(original.pieceStack[0]);
    expect(restored?.pieceStack[0]).toMatchObject({ kind:'note', pageI:1, xPercent:-12.25, yPercent:104 });
    expect(restored?.pieceStack[3]).toMatchObject({ kind:'answer', text:'Guard', placement:null });
  });

  it('reconnects placed answers to the hydrated page and blank', () => {
    const book = _restoreFixture();
    const page = book.pages[4] as ConclusionPage;
    const { placement } = book.pieceStack[1] as AnswerPiece;
    expect(placement?.page).toBe(page);
    expect(placement?.blank).toBe(page.conclusion.parts[1]);
  });

  it('does not regenerate removed loose pieces or restore transient state', () => {
    const book = _restoreFixture();
    book.pieceStack.splice(3, 1);
    book.isVisible = true;
    book.animationKind = 'flipNext';
    book.animationStartMetaTime = 500;
    book.animationDuration = 150;
    const snapshot = encodeBookSaveState(book);
    expect(snapshot.pieceStack).toHaveLength(bookSnapshot.pieceStack.length - 1);
    const expected = _restoreFixture();
    expected.pieceStack.splice(3, 1);
    expect(decodeBookSaveState(snapshot)).toEqual({ ...createDefaultBookState(), pageNo:expected.pageNo,
      pages:expected.pages, pieceStack:expected.pieceStack, levelUrls:expected.levelUrls });
  });

  it('rejects a page number outside the book', () => {
    expect(decodeBookSaveState({ ...bookSnapshot, pageNo:0 })).toBeNull();
  });

  it('rejects a note with no owner page', () => {
    const pieceStack = [...bookSnapshot.pieceStack];
    pieceStack[0] = { ...pieceStack[0], pageI:bookSnapshot.pages.length };
    expect(decodeBookSaveState({ ...bookSnapshot, pieceStack })).toBeNull();
  });

  it('rejects an answer owned by a non-conclusion page', () => {
    const pieceStack = [...bookSnapshot.pieceStack];
    pieceStack[3] = { ...pieceStack[3], pageI:1 };
    expect(decodeBookSaveState({ ...bookSnapshot, pieceStack })).toBeNull();
  });

  it('rejects a placement on a different conclusion page', () => {
    const pieceStack = [...bookSnapshot.pieceStack];
    pieceStack[1] = { ...pieceStack[1], kind:'answer', placement:{ pageI:6, partI:1 } };
    expect(decodeBookSaveState({ ...bookSnapshot, pieceStack })).toBeNull();
  });

  it('rejects a placement on a nonblank cloze part', () => {
    const pieceStack = [...bookSnapshot.pieceStack];
    pieceStack[1] = { ...pieceStack[1], kind:'answer', placement:{ pageI:4, partI:0 } };
    expect(decodeBookSaveState({ ...bookSnapshot, pieceStack })).toBeNull();
  });

  it('rejects two pieces assigned to one blank', () => {
    const pieceStack = [...bookSnapshot.pieceStack, bookSnapshot.pieceStack[1]];
    expect(decodeBookSaveState({ ...bookSnapshot, pieceStack })).toBeNull();
  });

  it('rejects a selected blank with no placed piece', () => {
    const pieceStack = bookSnapshot.pieceStack.filter((_, pieceI) => pieceI !== 1);
    expect(decodeBookSaveState({ ...bookSnapshot, pieceStack })).toBeNull();
  });

  it('rejects a placed piece whose text does not match the selected answer', () => {
    const pieceStack = [...bookSnapshot.pieceStack];
    pieceStack[1] = { ...pieceStack[1], text:'Guard' };
    expect(decodeBookSaveState({ ...bookSnapshot, pieceStack })).toBeNull();
  });

  it('rejects a placed piece whose style does not match the slot', () => {
    const pieceStack = [...bookSnapshot.pieceStack];
    pieceStack[1] = { ...pieceStack[1], styleNo:2 };
    expect(decodeBookSaveState({ ...bookSnapshot, pieceStack })).toBeNull();
  });
});