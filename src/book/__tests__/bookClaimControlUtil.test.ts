import { describe, expect, it } from 'vitest';
import { createLayout, findControlAtPoint, findControlRect, updateControlRect } from '@/canvasControls';
import { createAnswerSet } from '@/game/conclusions/answerSetUtil';
import ClozeBlank from '@/game/conclusions/types/ClozeBlank';
import { updateBookClaimControls } from '../bookClaimControlUtil';
import { onBookMouseDown, onBookMouseOver } from '../eventHandlers';
import BookPage from '../types/BookPage';
import { createDefaultBookState } from '../types/BookState';

function _createFixture(single:boolean = false, pageNo:number = 1) {
  // Use filled but incorrect answers: claim readiness must not check correctness.
  const blank:ClozeBlank = { type:'blank', answerSet:createAnswerSet(['First', 'Second'], 'people'),
    correctAnswerIndexes:[1], playerAnswerIndex:0 };
  const otherBlank = { ...blank };
  const page:Extract<BookPage, { kind:'conclusion' }> = {
    kind:'conclusion', headingText:'', chapterNo:1, answerSetIdToPieceStyleNoMap:{ people:3 },
    conclusion:{ id:'synthetic', title:'Synthetic', parts:[blank, otherBlank], isComplete:false,
      isLocked:false, isOptional:false, incorrectGuessCount:0, unlockConclusionIds:[], revealRoomIds:[] }
  };
  const bookState = createDefaultBookState();
  bookState.isVisible = true;
  bookState.pageNo = pageNo;
  bookState.pages = [page, { kind:'blank', headingText:'', chapterNo:1 }];

  // Match existing arrow endpoints and close geometry in unshifted book coordinates.
  const controls = createLayout();
  const areaWidth = single ? 400 : 800;
  const areaX = single && pageNo === 2 ? 500 : 100;
  const width = areaWidth * .05;
  updateControlRect('prevPage', { x:areaX, y:515, width, height:25 }, controls);
  updateControlRect('nextPage', { x:areaX + areaWidth - width, y:515, width, height:25 }, controls);
  updateControlRect('closeBook', { x:areaX + (areaWidth - width) / 2, y:515, width, height:25 }, controls);
  bookState.layout = { canvasWidth:1000, canvasHeight:600, rect:{ x:100, y:20, width:800, height:500 },
    isSinglePageView:single, pieceLayouts:[], pieceSlotLayouts:[], pieceLayoutsPageNo:pageNo, controlLayout:controls };
  return { bookState, page, blank, otherBlank, controls };
}

function _center(rect:{ x:number; width:number }):number {
  return rect.x + rect.width / 2;
}

describe('bookClaimControlUtil', () => {
  it('centers claim below a full conclusion in a two-page view, keeping close centered on the book', () => {
    const { bookState, controls } = _createFixture();
    updateBookClaimControls(bookState);
    expect(_center(findControlRect(controls, 'claimLeft'))).toBe(300);
    expect(_center(findControlRect(controls, 'closeBook'))).toBe(500);
    expect(findControlRect(controls, 'claimLeft')).toMatchObject({ y:515, width:40, height:25 });
    expect(controls.controls.find(control => control.id === 'claimRight')?.isVisible).toBe(false);
  });

  it('supports independent eligible conclusions on both displayed pages', () => {
    const { bookState, page, controls } = _createFixture();
    bookState.pages[1] = { ...page, conclusion:{ ...page.conclusion, id:'other' } };
    updateBookClaimControls(bookState);
    expect(_center(findControlRect(controls, 'claimLeft'))).toBe(300);
    expect(_center(findControlRect(controls, 'claimRight'))).toBe(700);
  });

  it('spaces previous, claim, close, and next equally beneath a single page', () => {
    const { bookState, controls } = _createFixture(true);
    updateBookClaimControls(bookState);
    const centers = ['prevPage', 'claimLeft', 'closeBook', 'nextPage'].map(id => _center(findControlRect(controls, id)));
    expect(centers[1] - centers[0]).toBeCloseTo(centers[2] - centers[1]);
    expect(centers[2] - centers[1]).toBeCloseTo(centers[3] - centers[2]);
    expect((centers[0] + centers[3]) / 2).toBe(300);
  });

  it('supports the selected right conclusion in single-page view without double-applying the view offset', () => {
    const { bookState, page, controls } = _createFixture(true, 2);
    bookState.pages[1] = { ...page };
    updateBookClaimControls(bookState);
    const claim = findControlRect(controls, 'claimRight');
    expect(claim.x).toBeCloseTo(500 + 380 / 3);
    onBookMouseOver(claim.x + claim.width / 2 - 200, 525, 0, bookState);
    expect(controls.hoveredControlId).toBe('claimRight');
  });

  it('never shows the hidden neighboring conclusion claim in single-page view', () => {
    const { bookState, controls } = _createFixture(true, 2);
    updateBookClaimControls(bookState);
    expect(controls.controls.filter(control => control.id.startsWith('claim')).every(control => !control.isVisible)).toBe(true);
    expect(_center(findControlRect(controls, 'closeBook'))).toBe(700);
  });

  it('restores three-button spacing when any blank is emptied, and returns to four when refilled', () => {
    const { bookState, blank, controls } = _createFixture(true);
    updateBookClaimControls(bookState);
    blank.playerAnswerIndex = -1;
    updateBookClaimControls(bookState);
    expect(_center(findControlRect(controls, 'closeBook'))).toBe(300);
    expect(controls.controls.find(control => control.id === 'claimLeft')?.isVisible).toBe(false);
    blank.playerAnswerIndex = 0;
    updateBookClaimControls(bookState);
    expect(_center(findControlRect(controls, 'closeBook'))).toBeCloseTo(100 + 380 * 2 / 3 + 10);
    expect(controls.controls).toHaveLength(5);
  });

  it('does not show claim for locked conclusions', () => {
    const { bookState, page, controls } = _createFixture();
    page.conclusion.isLocked = true;
    updateBookClaimControls(bookState);
    expect(controls.controls.find(control => control.id === 'claimLeft')?.isVisible).toBe(false);
  });

  it('does not show claim for completed conclusions', () => {
    const { bookState, page, controls } = _createFixture();
    page.conclusion.isComplete = true;
    updateBookClaimControls(bookState);
    expect(controls.controls.find(control => control.id === 'claimLeft')?.isVisible).toBe(false);
  });

  it('does not show claim for conclusions with no blanks', () => {
    const { bookState, page, controls } = _createFixture();
    page.conclusion.parts = [{ type:'text', text:'No blanks.' }];
    updateBookClaimControls(bookState);
    expect(controls.controls.find(control => control.id === 'claimLeft')?.isVisible).toBe(false);
  });

  it('drops stale claims when page content is replaced', () => {
    const { bookState, controls } = _createFixture();
    updateBookClaimControls(bookState);
    bookState.pages[0] = { kind:'blank', headingText:'', chapterNo:1 };
    updateBookClaimControls(bookState);
    expect(controls.controls.find(control => control.id === 'claimLeft')?.isVisible).toBe(false);
  });

  it('suppresses claims while animating or hidden', () => {
    const { bookState, controls } = _createFixture();
    bookState.animationKind = 'flipNext';
    updateBookClaimControls(bookState);
    expect(controls.controls.find(control => control.id === 'claimLeft')?.isVisible).toBe(false);
    bookState.animationKind = null;
    bookState.isVisible = false;
    updateBookClaimControls(bookState);
    expect(controls.controls.find(control => control.id === 'claimLeft')?.isVisible).toBe(false);
  });

  it('preserves hover on stable frames and clears it when a claim disappears', () => {
    const { bookState, controls, blank } = _createFixture();
    updateBookClaimControls(bookState);
    controls.hoveredControlId = 'claimLeft';
    updateBookClaimControls(bookState);
    expect(controls.hoveredControlId).toBe('claimLeft');
    blank.playerAnswerIndex = -1;
    updateBookClaimControls(bookState);
    expect(controls.hoveredControlId).toBeNull();
  });

  it('registers claim hit testing but ignores a click until normal slot geometry is prepared', () => {
    const { bookState, controls, page } = _createFixture();
    updateBookClaimControls(bookState);
    expect(findControlAtPoint(controls, 300, 525)).toBe('claimLeft');
    const before = structuredClone(bookState);
    expect(onBookMouseDown(300, 525, 0, bookState, true)).toBe(false);
    expect(bookState).toEqual(before);
    expect(page.conclusion.isComplete).toBe(false);
  });

  it('keeps an active drag and prepared geometry intact during control refresh', () => {
    const { bookState } = _createFixture();
    const piece = { conclusionPageI:0, styleNo:3, text:'First', xPercent:50, yPercent:50, placement:null };
    bookState.pieceDragState = { piece, grabOffset:[0, 0], extractedAppearance:null };
    const drag = bookState.pieceDragState;
    const slots = bookState.layout?.pieceSlotLayouts;
    updateBookClaimControls(bookState);
    expect(bookState.pieceDragState).toBe(drag);
    expect(bookState.layout?.pieceSlotLayouts).toBe(slots);
  });
});