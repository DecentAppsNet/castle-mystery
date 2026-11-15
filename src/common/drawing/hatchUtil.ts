/* This file draws tapered hatch lines inside rectangles.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */
/* v8 ignore file -- Visual canvas effect requires manual verification. @preserve */

import { assert } from "decent-portal";
import Point from "@/game/types/Point";
import Rect from "@/game/types/Rect";
import HatchStyle from "./types/HatchStyle";

type LineRange = [start:number, end:number];

function _lineRangeInsideAxis(origin:number, direction:number, extent:number):LineRange | null {
  const minimum = Math.min(0, extent);
  const maximum = Math.max(0, extent);
  if (direction === 0) {
    return origin < minimum || origin > maximum ? null : [-Infinity, Infinity];
  }
  const first = (minimum - origin) / direction;
  const last = (maximum - origin) / direction;
  return [Math.min(first, last), Math.max(first, last)];
}

function _drawTaperedHatchLine(destRect:Rect, style:HatchStyle, direction:Point,
  offset:number, context:CanvasRenderingContext2D) {
  // Intersect the centerline with both rectangle axes to find its visible endpoints.
  const [directionX, directionY] = direction;
  const normalX = -directionY;
  const normalY = directionX;
  const originX = normalX * offset;
  const originY = normalY * offset;
  const horizontalRange = _lineRangeInsideAxis(originX, directionX, destRect.width);
  const verticalRange = _lineRangeInsideAxis(originY, directionY, destRect.height);
  if (!horizontalRange || !verticalRange) return;
  const start = Math.max(horizontalRange[0], verticalRange[0]);
  const end = Math.min(horizontalRange[1], verticalRange[1]);
  if (start >= end) return;

  // Build a quadrilateral with each endpoint's width measured perpendicular to the line.
  const startX = destRect.x + originX + directionX * start;
  const startY = destRect.y + originY + directionY * start;
  const endX = destRect.x + originX + directionX * end;
  const endY = destRect.y + originY + directionY * end;
  const startRadius = style.lineWeightStart / 2;
  const endRadius = style.lineWeightEnd / 2;
  const linePath = new Path2D();
  linePath.moveTo(startX + normalX * startRadius, startY + normalY * startRadius);
  linePath.lineTo(endX + normalX * endRadius, endY + normalY * endRadius);
  linePath.lineTo(endX - normalX * endRadius, endY - normalY * endRadius);
  linePath.lineTo(startX - normalX * startRadius, startY - normalY * startRadius);
  linePath.closePath();
  context.fill(linePath);
}

// Draw hatch lines inside of a rectangle.
export function hatchRect(destRect:Rect, style:HatchStyle, context:CanvasRenderingContext2D) {
  // Validate the style contract before calculating hatch positions.
  assert(Number.isFinite(style.spacing) && style.spacing > 0);
  assert(Number.isFinite(style.angle));
  assert(Number.isFinite(style.lineWeightStart) && style.lineWeightStart >= 0);
  assert(Number.isFinite(style.lineWeightEnd) && style.lineWeightEnd >= 0);
  if (destRect.width === 0 || destRect.height === 0) return;

  // Project the rectangle onto the perpendicular axis to determine the hatch sweep.
  const directionX = Math.cos(style.angle);
  const directionY = Math.sin(style.angle);
  const direction:Point = [directionX, directionY];
  const normalX = -directionY;
  const normalY = directionX;
  const minX = Math.min(0, destRect.width);
  const maxX = Math.max(0, destRect.width);
  const minY = Math.min(0, destRect.height);
  const maxY = Math.max(0, destRect.height);
  const minOffset = Math.min(normalX * minX, normalX * maxX)
    + Math.min(normalY * minY, normalY * maxY);
  const maxOffset = Math.max(normalX * minX, normalX * maxX)
    + Math.max(normalY * minY, normalY * maxY);

  // Clip tapered edges to the rectangle without changing the caller's current path.
  const clipPath = new Path2D();
  clipPath.rect(destRect.x, destRect.y, destRect.width, destRect.height);
  context.save();
  context.clip(clipPath);
  context.fillStyle = style.color;

  // Space centerlines orthogonally, then restore the caller's drawing state.
  const lineCount = Math.floor((maxOffset - minOffset) / style.spacing);
  for (let lineI = 0; lineI <= lineCount; ++lineI) {
    const offset = minOffset + lineI * style.spacing;
    _drawTaperedHatchLine(destRect, style, direction, offset, context);
  }

  context.restore();
}