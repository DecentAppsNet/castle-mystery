import { assert, assertNonNullable } from "decent-portal";
import ControlLayout from "./types/ControlLayout";
import Rect from "@/game/types/Rect";
import { isPositionInRect } from "@/game/rectUtil";

export function createLayout(canvasWidth:number, canvasHeight:number):ControlLayout {
  assert(canvasWidth > 0 && canvasHeight > 0);
  return { 
    canvasWidth, canvasHeight, controls:[]
  }
}

export function updateControlRect(controlId:string, rect:Rect, layout:ControlLayout) {
  const existingControl = layout.controls.find(c => c.id === controlId);
  if (!existingControl) {
    layout.controls.push({ id:controlId, rect });
    return;
  }
  existingControl.rect = rect;
}

export function findControlRect(layout:ControlLayout, controlId:string):Rect {
  const existingControl = layout.controls.find(c => c.id === controlId);
  assertNonNullable(existingControl);
  return existingControl.rect;
}

export function findControlAtPoint(layout:ControlLayout, canvasX:number, canvasY:number):string|null {
  for(let controlI = 0; controlI < layout.controls.length; ++controlI) {
    if (isPositionInRect(canvasX, canvasY, layout.controls[controlI].rect)) return layout.controls[controlI].id;
  }
  return null;
}