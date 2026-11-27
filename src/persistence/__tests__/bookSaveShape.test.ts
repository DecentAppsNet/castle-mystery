import { describe, expect, it } from 'vitest';
import BookSaveState, { isValidBookSaveState } from '../types/BookSaveState';
import { isValidSavedBookPiece } from '../types/SavedBookPiece';
import { isValidSavedClozePart } from '../types/SavedClozePart';
import fixtureText from './fixtures/bookSaveState.json?raw';

const save = JSON.parse(fixtureText) as BookSaveState;

describe('book save shape', () => {
  it('accepts all page and cloze variants and notes, placed answers, and loose answers', () => {
    expect(isValidBookSaveState(save)).toBe(true);
  });

  it('rejects an unsupported version', () => {
    expect(isValidBookSaveState({ ...save, version:2 })).toBe(false);
  });

  it('requires the full root record', () => {
    expect(isValidBookSaveState({ ...save, pieceStack:undefined })).toBe(false);
  });

  it('rejects an unknown page kind', () => {
    expect(isValidBookSaveState({ ...save, pages:[{ ...save.pages[0], kind:'cover' }] })).toBe(false);
  });

  it('requires variant-specific page fields', () => {
    expect(isValidBookSaveState({ ...save, pages:[{ ...save.pages[1], subtitle:undefined }] })).toBe(false);
  });

  it('allows extra fields without interpreting cross-record references', () => {
    expect(isValidBookSaveState({ ...save, futureField:true, pageNo:999 })).toBe(true);
  });

  it('requires integer page numbers', () => {
    expect(isValidBookSaveState({ ...save, pageNo:3.5 })).toBe(false);
  });

  it('rejects an unknown cloze variant', () => {
    expect(isValidSavedClozePart({ type:'video' })).toBe(false);
  });

  it('requires the resolved image URL field', () => {
    expect(isValidSavedClozePart({ type:'image' })).toBe(false);
  });

  it('rejects non-finite piece coordinates', () => {
    expect(isValidSavedBookPiece({ ...save.pieceStack[0], xPercent:Infinity })).toBe(false);
  });

  it('rejects a note with an answer slot', () => {
    expect(isValidSavedBookPiece({ ...save.pieceStack[0], placement:{ pageI:4, partI:1 } })).toBe(false);
  });

  it('requires explicit placement for an answer piece', () => {
    expect(isValidSavedBookPiece({ ...save.pieceStack[1], placement:undefined })).toBe(false);
  });

  it('requires integer placement indexes', () => {
    expect(isValidSavedBookPiece({ ...save.pieceStack[1], placement:{ pageI:4, partI:1.5 } })).toBe(false);
  });
});