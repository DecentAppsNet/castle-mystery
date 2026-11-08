import { assert } from "decent-portal";

import { isPositionInRect } from "@/game/rectUtil";
import BookState from "./types/BookState";
import { hideBook } from "./drawing/bookAnimationUtil";

export function onBookMouseDown(canvasX:number, canvasY:number, metaTime:number, bookState:BookState) {
  assert(bookState.isVisible); // Caller should check.
  
  if (!bookState.layout) return;
  
  // Clicking outside bounds of book will close it.
  if (!isPositionInRect(canvasX, canvasY, bookState.layout.rect)) {
    hideBook(metaTime, bookState);
    return;
  }
}

export function onBookMouseUp(_canvasX:number, _canvasY:number, _metaTime:number, _bookState:BookState) {
  
}

export function onBookMouseOver(_canvasX:number, _canvasY:number, _metaTime:number, _bookState:BookState) {
  
}

export function onBookMouseWheel(_deltaY:number, _metaTime:number, _bookState:BookState) {

}