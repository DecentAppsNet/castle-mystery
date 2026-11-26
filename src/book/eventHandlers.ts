/* This file routes book mouse events to controls, dismissal, and loose-piece interactions.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assert } from "decent-portal";

import { isPositionInRect } from "@/game/rectUtil";
import BookState from "./types/BookState";
import { hideBook } from "./drawing/bookAnimationUtil";
import { calcPageRect, calcPageViewOffsetX, isLeftPageNo } from "./drawing/bookLayoutUtil";
import { findControlAtPoint } from "@/canvasControls";
import { goNextPage, goPrevPage } from "./navigationUtil";
import BookControlId from "./drawing/types/BookControlId";
import { beginBookPieceDrag, bringBookPieceToFront, releaseBookPieceDrag, findBookPieceAtPoint,
  moveBookPieceDrag } from "./pieces";
import { claimBookConclusion } from './claiming';
import { findVisitChapterTarget } from './chapterNavigationUtil';
import { NOTE_PIECE_STYLE_NO } from './pieces';
import Piece from './types/Piece';

export function findBookNoteClick(bookState:BookState, x:number, y:number):{ piece:Piece; isNew:boolean }|null {
  const { layout, pageNo } = bookState;
  if (!bookState.isVisible || bookState.animationKind || bookState.claimState || !layout
    || layout.pieceLayoutsPageNo !== pageNo || _findControlAtPoint(bookState, x, y) !== null) return null;
  const hit = findBookPieceAtPoint(bookState, x, y);
  if (hit) return hit.kind === 'note' ? { piece:hit, isNew:false } : null;
  if (layout.pieceSlotLayouts.some(slot => isPositionInRect(x, y, slot.rect))) return null;

  const leftPageNo = isLeftPageNo(pageNo) ? pageNo : pageNo - 1;
  const spread = { ...layout.rect, x:layout.rect.x + calcPageViewOffsetX(bookState) };
  for (const candidate of layout.isSinglePageView ? [pageNo] : [leftPageNo, leftPageNo + 1]) {
    const rect = calcPageRect(spread, candidate);
    if (!bookState.pages[candidate - 1] || !isPositionInRect(x, y, rect)) continue;
    return { isNew:true, piece:{ kind:'note', pageI:candidate - 1, styleNo:NOTE_PIECE_STYLE_NO, text:'',
      xPercent:(x - rect.x) / rect.width * 100, yPercent:(y - rect.y) / rect.height * 100 } };
  }
  return null;
}

function _findControlAtPoint(bookState:BookState, canvasX:number, canvasY:number):BookControlId|null {
  if (!bookState.layout) return null;
  const pageViewOffsetX = calcPageViewOffsetX(bookState);
  const result = findControlAtPoint(bookState.layout.controlLayout, canvasX - pageViewOffsetX, canvasY);
  return result === null ? null : result as BookControlId;
}

function _isPointInsideBook(bookState:BookState, canvasX:number, canvasY:number):boolean {
  if (!bookState.layout) return false;
  const pageViewOffsetX = calcPageViewOffsetX(bookState);
  const rect = { ...bookState.layout.rect, x:bookState.layout.rect.x + pageViewOffsetX};
  return isPositionInRect(canvasX, canvasY, rect);
}

export function onBookMouseDown(canvasX:number, canvasY:number, metaTime:number, bookState:BookState,
  canStartPieceDrag:boolean = false, onChapterLevelSelected:((levelUrl:string) => void)|null = null,
  loadedLevelUrl:string|null = null):boolean {
  if (bookState.claimState !== null) return false;
  assert(bookState.isVisible); // Caller should check.
  if (!bookState.layout || bookState.animationKind || bookState.pieceDragState !== null) return false;

  const id = _findControlAtPoint(bookState, canvasX, canvasY);
  if (id === null) onBookMouseLeave(bookState);
  const piece = id === null ? findBookPieceAtPoint(bookState, canvasX, canvasY) : null;
  if (piece !== null) {
    if (canStartPieceDrag) return beginBookPieceDrag(bookState, canvasX, canvasY);
    bringBookPieceToFront(bookState, piece);
    return false;
  }
  if (id === null && canStartPieceDrag && beginBookPieceDrag(bookState, canvasX, canvasY)) return true;
  if (id === 'nextChapter') {
    const lastPage = bookState.pages[bookState.pages.length - 1];
    assert(lastPage?.kind === 'chapterEnd');
    const levelI = bookState.levelUrls.indexOf(lastPage.levelUrl);
    const levelUrl = levelI < 0 ? undefined : bookState.levelUrls[levelI + 1];
    if (levelUrl && onChapterLevelSelected) onChapterLevelSelected(levelUrl);
    else hideBook(metaTime, bookState);
    return false;
  }
  if (id === 'visitChapter') {
    const target = findVisitChapterTarget(bookState, loadedLevelUrl);
    if (target) onChapterLevelSelected?.(target.levelUrl);
    return false;
  }
  if (id === 'closeBook' || (id === null && piece === null && !_isPointInsideBook(bookState, canvasX, canvasY))) {
    hideBook(metaTime, bookState);
    return false;
  }

  if (id === 'prevPage') goPrevPage(metaTime, bookState);
  if (id === 'nextPage') goNextPage(metaTime, bookState);
  if (id === 'claim') {
    const leftPageNo = bookState.pageNo % 2 === 1 ? bookState.pageNo : bookState.pageNo - 1;
    claimBookConclusion(bookState, leftPageNo, metaTime);
  }
  return false;
}

export function onBookMouseUp(canvasX:number, canvasY:number, _metaTime:number, bookState:BookState) {
  if (bookState.claimState !== null) return;
  if (bookState.pieceDragState !== null) {
    releaseBookPieceDrag(bookState, canvasX, canvasY);
    return;
  }
  assert(bookState.isVisible); // Caller should check.
  if (!bookState.layout || bookState.animationKind) return;

  const id = _findControlAtPoint(bookState, canvasX, canvasY);
  if (id !== null) console.log('mouse up on ' + id);
}

export function onBookMouseOver(canvasX:number, canvasY:number, metaTime:number, bookState:BookState) {
  if (bookState.claimState !== null) return;
  if (bookState.pieceDragState !== null) {
    moveBookPieceDrag(bookState, canvasX, canvasY);
    return;
  }
  assert(bookState.isVisible); // Caller should check.
  if (!bookState.layout || bookState.animationKind) return;
  
  const { layout } = bookState;
  const id = _findControlAtPoint(bookState, canvasX, canvasY);
  if (layout.controlLayout.hoveredControlId === id) return;
  layout.controlLayout.hoveredControlId = id;
  layout.controlHoverStartedAt = id === null ? undefined : metaTime;
}

export function onBookMouseLeave(bookState:BookState):void {
  const { layout } = bookState;
  if (!layout) return;
  layout.controlLayout.hoveredControlId = null;
  delete layout.controlHoverStartedAt;
}

export function onBookMouseWheel(_deltaY:number, _metaTime:number, bookState:BookState) {
  if (bookState.claimState !== null) return;
  assert(bookState.isVisible); // Caller should check.
  if (!bookState.layout || bookState.animationKind) return;
}