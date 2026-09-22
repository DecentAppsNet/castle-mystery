/* This file classifies detached emit-tip direction from active and source room geometry.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assert } from "decent-portal";

import Rect from "@/game/types/Rect";
import EmitTipDirection from "./types/EmitTipDirection";

function _isWithin(value:number, start:number, length:number):boolean {
  return value >= start && value <= start + length;
}

export function findEmitTipDirection(activeRoomId:string, activeRect:Rect,
    sourceRoomId:string, sourceRect:Rect):EmitTipDirection|null {
  if (sourceRoomId === activeRoomId) return null;
  const activeCenterX = activeRect.x + activeRect.width / 2;
  const activeCenterY = activeRect.y + activeRect.height / 2;

  if (_isWithin(activeCenterX, sourceRect.x, sourceRect.width)
    && sourceRect.y + sourceRect.height < activeCenterY) return 'up';
  if (_isWithin(activeCenterY, sourceRect.y, sourceRect.height)
    && sourceRect.x > activeCenterX) return 'right';
  if (_isWithin(activeCenterX, sourceRect.x, sourceRect.width)
    && sourceRect.y > activeCenterY) return 'bottom';
  if (_isWithin(activeCenterY, sourceRect.y, sourceRect.height)
    && sourceRect.x + sourceRect.width < activeCenterX) return 'left';

  const sourceCenterX = sourceRect.x + sourceRect.width / 2;
  const sourceCenterY = sourceRect.y + sourceRect.height / 2;
  const horizontal = sourceCenterX < activeCenterX ? 'left' : sourceCenterX > activeCenterX ? 'right' : null;
  const vertical = sourceCenterY < activeCenterY ? 'up' : sourceCenterY > activeCenterY ? 'bottom' : null;
  assert(horizontal !== null && vertical !== null);
  return `${vertical}-${horizontal}`;
}