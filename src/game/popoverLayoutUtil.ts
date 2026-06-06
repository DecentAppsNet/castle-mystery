/* This module groups non-visual popover box placement helpers, including candidate placement and canvas-constrained selection.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { clamp } from "@/common/numberUtil";

import Rect from "./types/Rect";

type PopoverPlacementCandidate = {
  rect:Rect,
  overflowArea:number,
  overlapArea:number,
  preferenceI:number
}

function _createRect(x:number, y:number, width:number, height:number):Rect {
  return { x, y, width, height };
}

function _createRightCenteredPopoverRect(targetRect:Rect, boxWidth:number, boxHeight:number, gap:number):Rect {
  return _createRect(targetRect.x + targetRect.width + gap,
    targetRect.y + (targetRect.height - boxHeight) / 2,
    boxWidth, boxHeight);
}

function _createBelowCenteredPopoverRect(targetRect:Rect, boxWidth:number, boxHeight:number, gap:number):Rect {
  return _createRect(targetRect.x + (targetRect.width - boxWidth) / 2,
    targetRect.y + targetRect.height + gap,
    boxWidth, boxHeight);
}

function _createAboveCenteredPopoverRect(targetRect:Rect, boxWidth:number, boxHeight:number, gap:number):Rect {
  return _createRect(targetRect.x + (targetRect.width - boxWidth) / 2,
    targetRect.y - boxHeight - gap,
    boxWidth, boxHeight);
}

function _createLeftCenteredPopoverRect(targetRect:Rect, boxWidth:number, boxHeight:number, gap:number):Rect {
  return _createRect(targetRect.x - boxWidth - gap,
    targetRect.y + (targetRect.height - boxHeight) / 2,
    boxWidth, boxHeight);
}

function _clampRectIntoCanvas(rect:Rect, canvasWidth:number, canvasHeight:number):Rect {
  const maxX = Math.max(0, canvasWidth - rect.width);
  const maxY = Math.max(0, canvasHeight - rect.height);
  return {
    ...rect,
    x:clamp(rect.x, 0, maxX),
    y:clamp(rect.y, 0, maxY)
  };
}

function _calcRectOverflowArea(rect:Rect, canvasWidth:number, canvasHeight:number):number {
  const insideWidth = Math.max(0, Math.min(rect.x + rect.width, canvasWidth) - Math.max(rect.x, 0));
  const insideHeight = Math.max(0, Math.min(rect.y + rect.height, canvasHeight) - Math.max(rect.y, 0));
  return rect.width * rect.height - insideWidth * insideHeight;
}

function _calcRectOverlapArea(rect1:Rect, rect2:Rect):number {
  const overlapWidth = Math.max(0, Math.min(rect1.x + rect1.width, rect2.x + rect2.width) - Math.max(rect1.x, rect2.x));
  const overlapHeight = Math.max(0, Math.min(rect1.y + rect1.height, rect2.y + rect2.height) - Math.max(rect1.y, rect2.y));
  return overlapWidth * overlapHeight;
}

function _comparePopoverPlacementCandidates(candidate1:PopoverPlacementCandidate, candidate2:PopoverPlacementCandidate):number {
  if (candidate1.overflowArea !== candidate2.overflowArea) return candidate1.overflowArea - candidate2.overflowArea;
  if (candidate1.overlapArea !== candidate2.overlapArea) return candidate1.overlapArea - candidate2.overlapArea;
  return candidate1.preferenceI - candidate2.preferenceI;
}

export function choosePopoverBoxRect(targetRect:Rect, boxWidth:number, boxHeight:number,
  canvasWidth:number, canvasHeight:number, gap:number):Rect {
  const candidateFactories = [
    _createRightCenteredPopoverRect,
    _createBelowCenteredPopoverRect,
    _createAboveCenteredPopoverRect,
    _createLeftCenteredPopoverRect
  ];
  const candidates = candidateFactories.map((createCandidateRect, preferenceI) => {
    const unclampedRect = createCandidateRect(targetRect, boxWidth, boxHeight, gap);
    const rect = _clampRectIntoCanvas(unclampedRect, canvasWidth, canvasHeight);
    return {
      rect,
      overflowArea:_calcRectOverflowArea(rect, canvasWidth, canvasHeight),
      overlapArea:_calcRectOverlapArea(rect, targetRect),
      preferenceI
    };
  });
  return candidates.reduce((bestCandidate, candidate) =>
    _comparePopoverPlacementCandidates(candidate, bestCandidate) < 0 ? candidate : bestCandidate
  ).rect;
}