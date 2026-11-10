import { assertNonNullable } from "decent-portal";
import BookState from "./types/BookState";
import { isLeftPageNo, updateControlLayout } from "./drawing/bookLayoutUtil";
import { shiftBookLeft, shiftBookRight } from "./drawing/bookAnimationUtil";
import { hideControl, showControl } from "@/canvasControls";
import ControlLayout from "@/canvasControls/types/ControlLayout";
import BookControlId from "./drawing/types/BookControlId";
import { startPageFlip } from "./drawing/pageFlipAnimationUtil";

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

function _setPageNo(pageNo:number, bookState:BookState) {
  bookState.pageNo = pageNo;
  updateControlLayout(bookState);
  setPageNavigationButtonVisibility(bookState);
}

function _changePageNo(pageNo:number, metaTime:number, bookState:BookState) {
  if (bookState.pageNo === pageNo) return;
  assertNonNullable(bookState.layout);
  const isCurrentLeftPage = isLeftPageNo(bookState.pageNo);
  const isNextLeftPage = isLeftPageNo(pageNo);
  const isShiftNeeded = bookState.layout.isSinglePageView && isCurrentLeftPage !== isNextLeftPage;
  const isGoingLeft = pageNo < bookState.pageNo;

  if (isShiftNeeded && isNextLeftPage !== isGoingLeft) {
    startPageFlip(metaTime, bookState, isGoingLeft ? 'flipPrev' : 'flipNext',
      (metaTime2, isAborted, bookState2) => {
        if (isAborted) return;
        _setPageNo(pageNo, bookState2);
        if (isNextLeftPage) {
          shiftBookLeft(metaTime2, bookState2);
        } else {
          shiftBookRight(metaTime2, bookState2);
        }
      });
    return;
  }

  _setPageNo(pageNo, bookState);

  if (isShiftNeeded) {
    if (isNextLeftPage) {
      shiftBookLeft(metaTime, bookState);
    } else {
      shiftBookRight(metaTime, bookState);
    }
  } else {
    if (isGoingLeft) {
      startPageFlip(metaTime, bookState, 'flipPrev');
    } else {
      startPageFlip(metaTime, bookState, 'flipNext');
    }
  }
}

export function goPrevPage(metaTime:number, bookState:BookState) {
  assertNonNullable(bookState.layout);
  let nextPageNo = bookState.pageNo - (bookState.layout.isSinglePageView ? 1 : 2);
  if (nextPageNo < 1) nextPageNo = 1;
  _changePageNo(nextPageNo, metaTime, bookState); 
}

export function goNextPage(metaTime:number, bookState:BookState) {
  assertNonNullable(bookState.layout);
  let nextPageNo = bookState.pageNo + (bookState.layout.isSinglePageView ? 1 : 2);
  if (nextPageNo > bookState.pages.length) nextPageNo = bookState.pages.length;
  _changePageNo(nextPageNo, metaTime, bookState); 
}