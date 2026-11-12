import { describe, expect, it } from 'vitest';
import { createLayout } from '@/canvasControls';
import { createDefaultBookState } from '../types/BookState';
import { goNextPage, goPrevPage } from '../navigationUtil';
import { calcBookOffsetsForAnimationAndUpdate } from '../drawing/bookAnimationUtil';

function _createSinglePageBookState(pageNo:number) {
  const bookState = createDefaultBookState();
  bookState.isVisible = true;
  bookState.pageNo = pageNo;
  bookState.pages = [
    { kind:'blank', headingText:'' },
    { kind:'bookStart', headingText:'', title:'', author:'', description:'' },
    { kind:'blank', headingText:'' },
    { kind:'blank', headingText:'' }
  ];
  bookState.layout = {
    canvasWidth:400, canvasHeight:600,
    rect:{ x:0, y:0, width:800, height:500 },
    isSinglePageView:true,
    singlePageViewOffsetX:200,
    controlLayout:createLayout()
  };
  return bookState;
}

describe('navigationUtil', () => {
  describe('goNextPage()', () => {
    it('finishes the next-page flip before shifting to a left page', () => {
      const bookState = _createSinglePageBookState(2);
      goNextPage(0, bookState);
      expect(bookState.animationKind).toBe('flipNext');
      expect(bookState.pageNo).toBe(2);
      const flipEnd = bookState.animationDuration;

      calcBookOffsetsForAnimationAndUpdate(flipEnd, bookState);
      expect(bookState.animationKind).toBe('shiftLeft');
      expect(bookState.animationStartMetaTime).toBe(flipEnd);
      expect(bookState.animationDuration).toBeGreaterThan(0);
      expect(bookState.pageNo).toBe(3);

      calcBookOffsetsForAnimationAndUpdate(flipEnd + bookState.animationDuration, bookState);
      expect(bookState.animationKind).toBeNull();
    });

    it('still shifts without flipping when moving from a left page to a right page', () => {
      const bookState = _createSinglePageBookState(1);
      goNextPage(0, bookState);
      expect(bookState.animationKind).toBe('shiftRight');
      expect(bookState.pageNo).toBe(2);
      calcBookOffsetsForAnimationAndUpdate(bookState.animationDuration, bookState);
      expect(bookState.animationKind).toBeNull();
    });

    it('still changes double-page spreads immediately with only a flip', () => {
      const bookState = _createSinglePageBookState(1);
      if (bookState.layout) bookState.layout.isSinglePageView = false;
      goNextPage(0, bookState);
      expect(bookState.animationKind).toBe('flipNext');
      expect(bookState.pageNo).toBe(3);
      calcBookOffsetsForAnimationAndUpdate(bookState.animationDuration, bookState);
      expect(bookState.animationKind).toBeNull();
    });
  });

  describe('goPrevPage()', () => {
    it('finishes the previous-page flip before shifting to a right page', () => {
      const bookState = _createSinglePageBookState(3);
      goPrevPage(0, bookState);
      expect(bookState.animationKind).toBe('flipPrev');
      expect(bookState.pageNo).toBe(3);
      const flipEnd = bookState.animationDuration;

      calcBookOffsetsForAnimationAndUpdate(flipEnd, bookState);
      expect(bookState.animationKind).toBe('shiftRight');
      expect(bookState.animationStartMetaTime).toBe(flipEnd);
      expect(bookState.animationDuration).toBeGreaterThan(0);
      expect(bookState.pageNo).toBe(2);

      calcBookOffsetsForAnimationAndUpdate(flipEnd + bookState.animationDuration, bookState);
      expect(bookState.animationKind).toBeNull();
    });

    it('still shifts without flipping when moving from a right page to a left page', () => {
      const bookState = _createSinglePageBookState(2);
      goPrevPage(0, bookState);
      expect(bookState.animationKind).toBe('shiftLeft');
      expect(bookState.pageNo).toBe(1);
      calcBookOffsetsForAnimationAndUpdate(bookState.animationDuration, bookState);
      expect(bookState.animationKind).toBeNull();
    });

    it('still changes double-page spreads immediately with only a flip', () => {
      const bookState = _createSinglePageBookState(3);
      if (bookState.layout) bookState.layout.isSinglePageView = false;
      goPrevPage(0, bookState);
      expect(bookState.animationKind).toBe('flipPrev');
      expect(bookState.pageNo).toBe(1);
      calcBookOffsetsForAnimationAndUpdate(bookState.animationDuration, bookState);
      expect(bookState.animationKind).toBeNull();
    });
  });
});