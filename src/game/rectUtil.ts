/* This module groups rectangle geometry helpers for containment, overlap, and aspect-ratio calculations.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import Rect from "./types/Rect";

export function createRect(x:number, y:number, width:number, height:number):Rect {
  return { x, y, width, height };
}

export function extendRectToContainRect(rect:Rect, otherRect:Rect):Rect {
  const leftX = Math.min(rect.x, otherRect.x);
  const topY = Math.min(rect.y, otherRect.y);
  const rightX = Math.max(rect.x + rect.width, otherRect.x + otherRect.width);
  const bottomY = Math.max(rect.y + rect.height, otherRect.y + otherRect.height);
  return createRect(leftX, topY, rightX - leftX, bottomY - topY);
}

export function doRectsOverlap(rect1:Rect, rect2:Rect):boolean {
  return rect1.x < rect2.x + rect2.width
    && rect1.x + rect1.width > rect2.x
    && rect1.y < rect2.y + rect2.height
    && rect1.y + rect1.height > rect2.y;
}

export function isPositionInOrOnRect(x:number, y:number, rect:Rect):boolean {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

export function isPositionStrictlyInRect(x:number, y:number, rect:Rect):boolean {
  return x > rect.x && x < rect.x + rect.width && y > rect.y && y < rect.y + rect.height;
}

export function isPositionInRect(x:number, y:number, rect:Rect):boolean {
  return x >= rect.x && x < rect.x + rect.width && y >= rect.y && y < rect.y + rect.height;
}