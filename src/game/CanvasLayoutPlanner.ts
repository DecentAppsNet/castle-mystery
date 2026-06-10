/* This module groups per-frame canvas layout planning helpers for reserved-rect tracking and popover placement.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { assert } from "decent-portal";
import { createRect, doRectsOverlap } from "./rectUtil";
import Rect from "./types/Rect";

const POPOVER_RESERVED_RECT_CLEARANCE = 5;

function _calcAnchorCenterX(anchorRect:Rect):number {
  return anchorRect.x + anchorRect.width / 2;
}

function _calcInitialPopoverY(anchorRect:Rect, popoverHeight:number):number {
  return anchorRect.y - popoverHeight - POPOVER_RESERVED_RECT_CLEARANCE;
}

function _calcInitialPopoverX(anchorRect:Rect, popoverWidth:number):number {
  return _calcAnchorCenterX(anchorRect) - popoverWidth / 2;
}

function _clampPopoverXIntoCanvas(popoverX:number, popoverWidth:number, canvasWidth:number):number {
  if (popoverWidth >= canvasWidth) return (canvasWidth - popoverWidth) / 2;
  if (popoverX < 0) return 0;
  if (popoverX + popoverWidth > canvasWidth) return canvasWidth - popoverWidth;
  return popoverX;
}

function _findTopmostOverlappingReservedRectY(popoverRect:Rect, reservedRects:ReadonlyArray<Rect>):number|null {
  let topmostReservedRectY:number|null = null;
  reservedRects.forEach(reservedRect => {
    if (popoverRect.y + popoverRect.height <= reservedRect.y) return;
    if (!doRectsOverlap(popoverRect, reservedRect)) return;
    if (topmostReservedRectY === null || reservedRect.y < topmostReservedRectY) topmostReservedRectY = reservedRect.y;
  });
  return topmostReservedRectY;
}

function _findBestAbovePopoverRect(popoverX:number, popoverWidth:number, popoverHeight:number,
  anchorRect:Rect, reservedRects:ReadonlyArray<Rect>):Rect|null {
  assert(popoverWidth > 0);
  assert(popoverHeight > 0);

  let popoverY = _calcInitialPopoverY(anchorRect, popoverHeight);
  while (popoverY >= 0) {
    const popoverRect = createRect(popoverX, popoverY, popoverWidth, popoverHeight);
    const topmostReservedRectY = _findTopmostOverlappingReservedRectY(popoverRect, reservedRects);
    if (topmostReservedRectY === null) return popoverRect;
    const nextPopoverY = topmostReservedRectY - popoverHeight - POPOVER_RESERVED_RECT_CLEARANCE;
    if (!(nextPopoverY < popoverY)) { // We should never reach this branch. But it is here for safety.
      console.error('Unexpectedly needed guard code to exit from loop');
      return null;
    }
    popoverY = nextPopoverY;
  }

  return null;
}

export default class CanvasLayoutPlanner {
  readonly canvasWidth:number;
  readonly canvasHeight:number;
  readonly reservedRects:Rect[];

  constructor(canvasWidth:number, canvasHeight:number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.reservedRects = [];
  }

  reserveRect(rect:Rect):void {
    this.reservedRects.push({ ...rect });
  }

  findBestPopoverRect(anchorRect:Rect, popoverWidth:number, popoverHeight:number):Rect {
    const popoverX = _clampPopoverXIntoCanvas(_calcInitialPopoverX(anchorRect, popoverWidth), popoverWidth, this.canvasWidth);
    const abovePopoverRect = _findBestAbovePopoverRect(popoverX, popoverWidth, popoverHeight, anchorRect, this.reservedRects);
    if (abovePopoverRect) return abovePopoverRect;
    
    return createRect(popoverX, 0, popoverWidth, popoverHeight);
  }
}