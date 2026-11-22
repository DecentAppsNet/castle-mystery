/* This file draws book page obscuring overlays.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */
/* v8 ignore file -- Canvas page overlays are verified visually. @preserve */

import { assert } from 'decent-portal';
import Rect from '@/game/types/Rect';
import { drawObscuredPolygon } from '@/common/drawing/obscurePolygonDrawUtil';
import PageWriter from './PageWriter';

function _createPageClipPath(rect:Rect, isLeftPage:boolean):Path2D {
  const bindingX = isLeftPage ? rect.x + rect.width : rect.x;
  const outerX = isLeftPage ? rect.x : rect.x + rect.width;
  const direction = isLeftPage ? -1 : 1;
  const curveWidth = rect.width * .105;
  const curveDepth = rect.height * .015;
  const flatX = bindingX + direction * curveWidth;
  const bottom = rect.y + rect.height;
  const path = new Path2D();

  path.moveTo(bindingX, rect.y + curveDepth);
  path.bezierCurveTo(bindingX + direction * curveWidth * .3, rect.y + curveDepth * .3,
    bindingX + direction * curveWidth * .65, rect.y, flatX, rect.y);
  path.lineTo(outerX, rect.y);
  path.lineTo(outerX, bottom);
  path.lineTo(flatX, bottom);
  path.bezierCurveTo(bindingX + direction * curveWidth * .65, bottom,
    bindingX + direction * curveWidth * .3, bottom + curveDepth * .3, bindingX, bottom + curveDepth);
  path.closePath();
  return path;
}

export function drawObscuredPage(metaTime:number, innerPageRect:Rect, isLeftPage:boolean, pw:PageWriter,
    context:CanvasRenderingContext2D) {
  const topPercent = pw.getCursorYPercent();
  const bottomPercent = 100 - 2 * pw.getLineHeight('s');
  assert(topPercent < bottomPercent);
  const left = innerPageRect.x;
  const right = left + innerPageRect.width;
  const top = innerPageRect.y + innerPageRect.height * topPercent / 100;
  const bottom = innerPageRect.y + innerPageRect.height * bottomPercent / 100;
  const clipPath = _createPageClipPath({ x:left, y:top, width:right - left, height:bottom - top }, isLeftPage);

  drawObscuredPolygon([
    [left, top],
    [right, top],
    [right, bottom],
    [left, bottom]
  ], context, metaTime + (isLeftPage ? 0 : 2000), clipPath);
}