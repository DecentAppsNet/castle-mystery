import { assertNonNullable } from "decent-portal";
import BookState from "./types/BookState";
import { isLeftPageNo, updateControlLayout } from "./drawing/bookLayoutUtil";
import { shiftBookLeft, shiftBookRight } from "./drawing/bookAnimationUtil";
import { hideControl, showControl } from "@/canvasControls";
import ControlLayout from "@/canvasControls/types/ControlLayout";
import BookControlId from "./drawing/types/BookControlId";

function _setControlVisibility(controlId:BookControlId, isVisible:boolean, controlLayout:ControlLayout) {
  if (isVisible) {
    showControl(controlId, controlLayout);
  } else {
    hideControl(controlId, controlLayout);
  }
}

export function setPageNavigationButtonVisibility(bookState:BookState) {
  assertNonNullable(bookState.layout);
  const showPrevPage = !(bookState.pageNo === 1 || 
    (!bookState.layout.isSinglePageView && bookState.pageNo === 2));
  const showNextPage = !(bookState.pageNo === bookState.pages.length || 
    (!bookState.layout.isSinglePageView && bookState.pageNo === bookState.pages.length - 1));
  _setControlVisibility('prevPage', showPrevPage, bookState.layout.controlLayout);
  _setControlVisibility('nextPage', showNextPage, bookState.layout.controlLayout);
}

function _changePageNo(pageNo:number, metaTime:number, bookState:BookState) {
  if (bookState.pageNo === pageNo) return;
  assertNonNullable(bookState.layout);
  const isCurrentLeftPage = isLeftPageNo(bookState.pageNo);
  const isNextLeftPage = isLeftPageNo(pageNo);
  const isShiftNeeded = bookState.layout.isSinglePageView && isCurrentLeftPage !== isNextLeftPage;
  bookState.pageNo = pageNo;
  updateControlLayout(bookState);
  setPageNavigationButtonVisibility(bookState);

  if (isShiftNeeded) {
    if (isNextLeftPage) {
      shiftBookLeft(metaTime, bookState);
    } else {
      shiftBookRight(metaTime, bookState);
    }
  }
}

function _isAtFirstPage(bookState:BookState):boolean {
  return bookState.pageNo === 1;
}

function _isAtLastPage(bookState:BookState):boolean {
  return bookState.pageNo === bookState.pages.length;
}

export function goPrevPage(metaTime:number, bookState:BookState) {
  if (_isAtFirstPage(bookState)) return;
  assertNonNullable(bookState.layout);
  let nextPageNo = bookState.pageNo - (bookState.layout.isSinglePageView ? 1 : 2);
  if (nextPageNo < 1) nextPageNo = 1;
  _changePageNo(nextPageNo, metaTime, bookState); 
}

export function goNextPage(metaTime:number, bookState:BookState) {
  if (_isAtLastPage(bookState)) return;
  assertNonNullable(bookState.layout);
  let nextPageNo = bookState.pageNo + (bookState.layout.isSinglePageView ? 1 : 2);
  if (nextPageNo > bookState.pages.length) nextPageNo = bookState.pages.length;
  _changePageNo(nextPageNo, metaTime, bookState); 
}