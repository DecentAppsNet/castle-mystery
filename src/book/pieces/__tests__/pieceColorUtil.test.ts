import { describe, expect, it } from 'vitest';
import { createAnswerSet } from '@/conclusions';
import ClozeBlank from '@/conclusions/types/ClozeBlank';
import { getBookPieceBackgroundColor } from '../pieceColorUtil';
import { getPieceFlairProfile } from '../pieceFlairUtil';
import BookPage from '@/book/types/BookPage';
import { createDefaultBookState } from '@/book/types/BookState';
import Piece from '@/book/types/Piece';

function _createFixture() {
  const answerSet = createAnswerSet(['First', 'Second'], 'people');
  const blank:ClozeBlank = { type:'blank', answerSet, correctAnswerIndexes:[1], playerAnswerIndex:0 };
  const otherBlank:ClozeBlank = { ...blank, playerAnswerIndex:-1 };
  const page:Extract<BookPage, { kind:'conclusion' }> = {
    kind:'conclusion', headingText:'', chapterNo:1, levelUrl:'first.md', answerSetIdToPieceStyleNoMap:{ people:3 }, layoutTweaks:[],
    conclusion:{ id:'synthetic', title:'Synthetic', parts:[blank, otherBlank], isComplete:false,
      isLocked:false, isOptional:false, incorrectGuessCount:0, unlockConclusionIds:[], revealRoomIds:[] }
  };
  const piece:Piece = { conclusionPageI:0, text:'Second', styleNo:3, xPercent:50, yPercent:50, placement:null };
  const bookState = createDefaultBookState();
  bookState.pages = [page];
  return { bookState, page, piece, blank, otherBlank };
}

describe('pieceColorUtil', () => {
  describe('getBookPieceBackgroundColor()', () => {
    it('retains the style color while any matching slot is empty', () => {
      const { bookState, piece } = _createFixture();
      expect(getBookPieceBackgroundColor(bookState, piece)).toBe(getPieceFlairProfile(3).pieceColor);
    });

    it('uses medium grey when all matching slots are filled, including wrong answers', () => {
      const { bookState, piece, otherBlank } = _createFixture();
      otherBlank.playerAnswerIndex = 0;
      expect(getBookPieceBackgroundColor(bookState, piece)).toBe('#808080');
    });

    it('restores the original color immediately when a filled slot is cleared', () => {
      const { bookState, piece, blank, otherBlank } = _createFixture();
      otherBlank.playerAnswerIndex = 1;
      expect(getBookPieceBackgroundColor(bookState, piece)).toBe('#808080');
      blank.playerAnswerIndex = -1;
      expect(getBookPieceBackgroundColor(bookState, piece)).toBe(getPieceFlairProfile(3).pieceColor);
    });

    it('ignores empty slots with another style in the same conclusion', () => {
      const { bookState, piece, page, otherBlank } = _createFixture();
      otherBlank.playerAnswerIndex = 1;
      const answerSet = createAnswerSet(['Room'], 'rooms');
      bookState.pages[0] = { ...page, answerSetIdToPieceStyleNoMap:{ people:3, rooms:2 } };
      page.conclusion.parts.push({ ...otherBlank, answerSet, playerAnswerIndex:-1 });
      expect(getBookPieceBackgroundColor(bookState, piece)).toBe('#808080');
    });

    it('ignores empty slots of the same style on a page with a duplicate exact conclusion ID', () => {
      const { bookState, piece, page, blank, otherBlank } = _createFixture();
      otherBlank.playerAnswerIndex = 1;
      bookState.pages.push({ kind:'blank', headingText:'', chapterNo:1 }, { ...page, conclusion:{ ...page.conclusion,
        parts:[{ ...blank, playerAnswerIndex:-1 }] } });
      expect(getBookPieceBackgroundColor(bookState, piece)).toBe('#808080');
      expect(getBookPieceBackgroundColor(bookState, { ...piece, conclusionPageI:2 }))
        .toBe(getPieceFlairProfile(3).pieceColor);
    });

    it('checks all answer sets assigned the same style', () => {
      const { bookState, piece, page, otherBlank } = _createFixture();
      const answerSet = createAnswerSet(['Third'], 'people');
      const replacement = { ...otherBlank, answerSet };
      page.conclusion.parts[1] = replacement;
      bookState.pages[0] = { ...page, answerSetIdToPieceStyleNoMap:{ people:3, [answerSet.id]:3 } };
      expect(getBookPieceBackgroundColor(bookState, piece)).toBe(getPieceFlairProfile(3).pieceColor);
      replacement.playerAnswerIndex = 0;
      expect(getBookPieceBackgroundColor(bookState, piece)).toBe('#808080');
    });

    it('does not grey a piece with no matching slots', () => {
      const { bookState, piece } = _createFixture();
      piece.styleNo = 4;
      expect(getBookPieceBackgroundColor(bookState, piece)).toBe(getPieceFlairProfile(4).pieceColor);
    });
  });
});