/* This module groups rectangle geometry helpers for containment, overlap, and aspect-ratio calculations.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import Rect from "./types/Rect";

export function isPositionInOrOnRect(x:number, y:number, rect:Rect):boolean {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

export function isPositionStrictlyInRect(x:number, y:number, rect:Rect):boolean {
  return x > rect.x && x < rect.x + rect.width && y > rect.y && y < rect.y + rect.height;
}

export function isPositionInRect(x:number, y:number, rect:Rect):boolean {
  return x >= rect.x && x < rect.x + rect.width && y >= rect.y && y < rect.y + rect.height;
}