import { assertNonNullable } from "decent-portal";
import ControlLayout from "./types/ControlLayout";
import Rect from "@/game/types/Rect";
import { isPositionInRect } from "@/game/rectUtil";

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
  for(let controlI = 0; controlI < layout.controls.length; ++controlI) {
    const control = layout.controls[controlI];
    if (!control.isVisible) continue;
    if (isPositionInRect(canvasX, canvasY, control.rect)) return control.id;
  }
  return null;
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