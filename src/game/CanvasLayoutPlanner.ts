/* This module groups per-frame canvas layout planning helpers for reserved-rect tracking and popover placement.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { createRect, doRectsOverlap } from "./rectUtil";
import Rect from "./types/Rect";

function _calcAnchorCenterX(anchorRect:Rect):number {
  return anchorRect.x + anchorRect.width / 2;
}

function _calcInitialPopoverY(anchorRect:Rect, popoverHeight:number):number {
  return anchorRect.y - popoverHeight;
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
    if (!doRectsOverlap(popoverRect, reservedRect)) return;
    if (topmostReservedRectY === null || reservedRect.y < topmostReservedRectY) topmostReservedRectY = reservedRect.y;
  });
  return topmostReservedRectY;
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
    let popoverY = _calcInitialPopoverY(anchorRect, popoverHeight);

    while (popoverY > 0) {
      const popoverRect = createRect(popoverX, popoverY, popoverWidth, popoverHeight);
      const topmostReservedRectY = _findTopmostOverlappingReservedRectY(popoverRect, this.reservedRects);
      if (topmostReservedRectY === null) return popoverRect;
      const nextPopoverY = topmostReservedRectY - popoverHeight;
      if (!(nextPopoverY < popoverY)) return createRect(popoverX, Math.max(0, popoverY - 1), popoverWidth, popoverHeight);
      popoverY = nextPopoverY;
    }

    return createRect(popoverX, 0, popoverWidth, popoverHeight);
  }
}