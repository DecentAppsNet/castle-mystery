import { describe, expect, it } from 'vitest';
import { createLayout, updateControlRect } from '@/canvasControls';
import { createBookState } from '../bookContentUtil';
import { onBookMouseDown } from '../eventHandlers';
import { findBookPieceAtPoint } from '../pieceInteractionUtil';

function _createBookState() {
  const bookState = createBookState();
  const conclusionPages = bookState.pages.filter(page => page.kind === 'conclusion');
  const [lower, upper] = conclusionPages[0].pieces;
  conclusionPages[0].pieces = [lower];
  conclusionPages[1].pieces = [upper];
  bookState.pages = conclusionPages;
  bookState.pageNo = 1;
  bookState.isVisible = true;
  const layout = {
    canvasWidth:1000, canvasHeight:600,
    rect:{ x:100, y:20, width:800, height:500 },
    isSinglePageView:false,
    singlePageViewOffsetX:200,
    pieceLayoutsPageNo:1,
    pieceLayouts:[
      { piece:lower, isVisible:true, rect:{ x:80, y:40, width:40, height:30 },
        metrics:{ width:40, padding:2, fontSizePixels:12 } },
      { piece:upper, isVisible:true, rect:{ x:90, y:45, width:40, height:30 },
        metrics:{ width:40, padding:2, fontSizePixels:12 } }
    ],
    controlLayout:createLayout()
  };
  bookState.layout = layout;
  return { bookState, layout, lower, upper };
}

describe('pieceInteractionUtil', () => {
  describe('findBookPieceAtPoint()', () => {
    it('returns the topmost piece across both conclusion pages', () => {
      const { bookState, upper } = _createBookState();
      expect(findBookPieceAtPoint(bookState, 100, 50)).toBe(upper);
    });

    it('returns the lower piece outside the topmost rectangle', () => {
      const { bookState, lower } = _createBookState();
      expect(findBookPieceAtPoint(bookState, 85, 42)).toBe(lower);
    });

    it('skips a hidden topmost piece', () => {
      const { bookState, layout, lower } = _createBookState();
      layout.pieceLayouts[1].isVisible = false;
      expect(findBookPieceAtPoint(bookState, 100, 50)).toBe(lower);
    });

    it('uses prepared canvas coordinates without applying a single-page offset again', () => {
      const { bookState, layout, upper } = _createBookState();
      layout.isSinglePageView = true;
      expect(findBookPieceAtPoint(bookState, 100, 50)).toBe(upper);
      expect(findBookPieceAtPoint(bookState, 300, 50)).toBeNull();
    });

    it('returns null outside all pieces', () => {
      const { bookState } = _createBookState();
      expect(findBookPieceAtPoint(bookState, 500, 200)).toBeNull();
    });

    it('returns null for empty records', () => {
      const { bookState, layout } = _createBookState();
      layout.pieceLayouts = [];
      expect(findBookPieceAtPoint(bookState, 100, 50)).toBeNull();
    });

    it('returns null without a layout', () => {
      const { bookState } = _createBookState();
      bookState.layout = null;
      expect(findBookPieceAtPoint(bookState, 100, 50)).toBeNull();
    });

    it('returns null while hidden', () => {
      const { bookState } = _createBookState();
      bookState.isVisible = false;
      expect(findBookPieceAtPoint(bookState, 100, 50)).toBeNull();
    });

    it('returns null while animating', () => {
      const { bookState } = _createBookState();
      bookState.animationKind = 'flipNext';
      expect(findBookPieceAtPoint(bookState, 100, 50)).toBeNull();
    });

    it('rejects records prepared for another selected page', () => {
      const { bookState } = _createBookState();
      bookState.pageNo = 2;
      expect(findBookPieceAtPoint(bookState, 100, 50)).toBeNull();
    });

    it('rejects invalidated records', () => {
      const { bookState } = _createBookState();
      if (bookState.layout) bookState.layout.pieceLayoutsPageNo = null;
      expect(findBookPieceAtPoint(bookState, 100, 50)).toBeNull();
    });

    it('ignores obsolete records after page content is replaced', () => {
      const { bookState } = _createBookState();
      bookState.pages = [];
      expect(findBookPieceAtPoint(bookState, 100, 50)).toBeNull();
    });

    it('skips a stale topmost piece while retaining the visible lower piece', () => {
      const { bookState, lower } = _createBookState();
      bookState.pages[1] = { kind:'blank', headingText:'' };
      expect(findBookPieceAtPoint(bookState, 100, 50)).toBe(lower);
    });
  });

  describe('onBookMouseDown()', () => {
    it('does not dismiss when a visible piece protrudes beyond the book', () => {
      const { bookState } = _createBookState();
      onBookMouseDown(95, 50, 0, bookState);
      expect(bookState.animationKind).toBeNull();
      expect(bookState.isVisible).toBe(true);
    });

    it('still dismisses outside the book and all pieces', () => {
      const { bookState } = _createBookState();
      onBookMouseDown(0, 0, 0, bookState);
      expect(bookState.animationKind).toBe('disappear');
    });

    it('keeps a close control above an overlapping piece', () => {
      const { bookState, layout } = _createBookState();
      updateControlRect('closeBook', { x:90, y:45, width:40, height:30 }, layout.controlLayout);
      onBookMouseDown(100, 50, 0, bookState);
      expect(bookState.animationKind).toBe('disappear');
    });

    it('still applies the single-page offset to control lookup exactly once', () => {
      const { bookState, layout } = _createBookState();
      layout.isSinglePageView = true;
      updateControlRect('closeBook', { x:90, y:45, width:40, height:30 }, layout.controlLayout);
      onBookMouseDown(300, 50, 0, bookState);
      expect(bookState.animationKind).toBe('disappear');
    });

    it('does not protect protruding stale pieces from outside dismissal', () => {
      const { bookState } = _createBookState();
      bookState.pages = [];
      onBookMouseDown(95, 50, 0, bookState);
      expect(bookState.animationKind).toBe('disappear');
    });
  });
});