/* This file groups canvas control layout, visibility, rectangular hit testing, and drag calculations.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assertNonNullable } from "decent-portal";
import ControlLayout from "./types/ControlLayout";
import Control from "./types/Control";
import Rect from "@/game/types/Rect";
import Point from "@/game/types/Point";
import { clamp } from "@/common/numberUtil";
import { isPositionInRect } from "@/game/rectUtil";

export function calcDragGrabOffset(rect:Readonly<Rect>, canvasX:number, canvasY:number):Point {
  return [canvasX - rect.x - rect.width / 2, canvasY - rect.y - rect.height / 2];
}

export function calcClampedDragCenter(grabOffset:Point, bounds:Readonly<Rect>, canvasX:number, canvasY:number):Point {
  return [
    clamp(canvasX - grabOffset[0], bounds.x, bounds.x + bounds.width),
    clamp(canvasY - grabOffset[1], bounds.y, bounds.y + bounds.height)
  ];
}

export function findTopmostControlAtPoint<ControlType extends Control>(
  controls:ReadonlyArray<ControlType>, canvasX:number, canvasY:number):ControlType|null {
  for (let controlI = controls.length - 1; controlI >= 0; --controlI) {
    const control = controls[controlI];
    if (!control.isVisible) continue;
    if (isPositionInRect(canvasX, canvasY, control.rect)) return control;
  }
  return null;
}

export function createLayout(canvasWidth:number = -1, canvasHeight:number = -1):ControlLayout {
  return { 
    canvasWidth, canvasHeight, controls:[], hoveredControlId:null
  }
}

export function updateControlRect(controlId:string, rect:Rect, layout:ControlLayout) {
  const existingControl = layout.controls.find(c => c.id === controlId);
  if (!existingControl) {
    layout.controls.push({ id:controlId, rect, isVisible:true });
    return;
  }
  existingControl.rect = rect;
  layout.hoveredControlId = null;
}

export function findControlRect(layout:ControlLayout, controlId:string):Rect {
  const existingControl = layout.controls.find(c => c.id === controlId && c.isVisible);
  assertNonNullable(existingControl);
  return existingControl.rect;
}

export function findControlAtPoint(layout:ControlLayout, canvasX:number, canvasY:number):string|null {
  return findTopmostControlAtPoint(layout.controls, canvasX, canvasY)?.id ?? null;
}

function _setControlVisibility(controlId:string, isVisible:boolean, layout:ControlLayout) {
  const existingControl = layout.controls.find(c => c.id === controlId);
  if (!existingControl || existingControl.isVisible === isVisible) return;
  if (layout.hoveredControlId === controlId) layout.hoveredControlId = null;
  existingControl.isVisible = isVisible;
}

export function hideControl(controlId:string, layout:ControlLayout) {
  _setControlVisibility(controlId, false, layout);
}

export function showControl(controlId:string, layout:ControlLayout) {
  _setControlVisibility(controlId, true, layout);
}