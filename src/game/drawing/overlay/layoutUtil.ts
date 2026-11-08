/* Helpers for creating, updating, and accessing layout. Not coupled to any one control.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assert, assertNonNullable } from "decent-portal";

import OverlayLayout from "./types/OverlayLayout";
import OverlayControlId from "./types/OverlayControlId";
import Rect from "@/game/types/Rect";
import { isPositionInRect } from "@/game/rectUtil";

export function createOverlayLayout(canvasWidth:number, canvasHeight:number):OverlayLayout {
  assert(canvasWidth > 0 && canvasHeight > 0);
  return { 
    canvasWidth, canvasHeight, controls:[]
  }
}

export function updateControlRect(layout:OverlayLayout, controlId:OverlayControlId, rect:Rect) {
  const existingControl = layout.controls.find(c => c.id === controlId);
  if (!existingControl) {
    layout.controls.push({ id:controlId, rect });
    return;
  }
  existingControl.rect = rect;
}

export function findControlRect(layout:OverlayLayout, controlId:OverlayControlId):Rect {
  const existingControl = layout.controls.find(c => c.id === controlId);
  assertNonNullable(existingControl);
  return existingControl.rect;
}

export function findControlAtPoint(layout:OverlayLayout, canvasX:number, canvasY:number):OverlayControlId|null {
  for(let controlI = 0; controlI < layout.controls.length; ++controlI) {
    if (isPositionInRect(canvasX, canvasY, layout.controls[controlI].rect)) return layout.controls[controlI].id;
  }
  return null;
}