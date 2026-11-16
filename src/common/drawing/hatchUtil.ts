/* This file draws layers of tapered hatch lines inside rectangles.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */
/* v8 ignore file -- Visual canvas effect requires manual verification. @preserve */

import { assert } from "decent-portal";
import Point from "@/game/types/Point";
import Rect from "@/game/types/Rect";
import HatchLineStyle from "./types/HatchLineStyle";
import HatchStyle from "./types/HatchStyle";

type LineRange = [start:number, end:number];

const HATCH_STYLES:HatchStyle[] = [
  {
    lineStyles:[{angle: .5, spacing: .008, lineWeightStart: .001, lineWeightEnd: .002, color: '#780000'}]
  },{
    lineStyles:[{angle: 1.7, spacing: .006, lineWeightStart: .0015, lineWeightEnd: .002, color: '#007878'}]
  },{
    lineStyles:[{angle: 2.5, spacing: .008, lineWeightStart: .001, lineWeightEnd: .002, color: '#007606'}]
  },{
    lineStyles:[{angle: .3, spacing: .01, lineWeightStart: .001, lineWeightEnd: .002, color: '#747a00'}]
  },{
    lineStyles:[{angle: .5, spacing: .008, lineWeightStart: .001, lineWeightEnd: .002, color: '#005e76'},
      {angle: 1.5, spacing: .008, lineWeightStart: .0005, lineWeightEnd: .001, color: '#380070'}]
  },{
    lineStyles:[{angle: 1.7, spacing: .005, lineWeightStart: .0015, lineWeightEnd: .002, color: '#770000'},
      {angle: 2.7, spacing: .009, lineWeightStart: .0015, lineWeightEnd: .002, color: '#73002e'}]
  },{
    lineStyles:[{angle: 2.5, spacing: .008, lineWeightStart: .001, lineWeightEnd: .003, color: '#547b00'},
      {angle: .5, spacing: .008, lineWeightStart: .001, lineWeightEnd: .003, color: '#0e7900'}]
  },{
    lineStyles:[{angle: .6, spacing: .005, lineWeightStart: .001, lineWeightEnd: .004, color: '#230084'},
      {angle: 2.3, spacing: .02, lineWeightStart: .001, lineWeightEnd: .002, color: '#001c72'}
    ]
  },
];

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

function _drawTaperedHatchLine(destRect:Rect, style:HatchLineStyle, direction:Point,
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

  // Convert height-fraction widths to pixels and build the tapered quadrilateral.
  const startX = destRect.x + originX + directionX * start;
  const startY = destRect.y + originY + directionY * start;
  const endX = destRect.x + originX + directionX * end;
  const endY = destRect.y + originY + directionY * end;
  const startRadius = style.lineWeightStart * context.canvas.height / 2;
  const endRadius = style.lineWeightEnd * context.canvas.height / 2;
  const linePath = new Path2D();
  linePath.moveTo(startX + normalX * startRadius, startY + normalY * startRadius);
  linePath.lineTo(endX + normalX * endRadius, endY + normalY * endRadius);
  linePath.lineTo(endX - normalX * endRadius, endY - normalY * endRadius);
  linePath.lineTo(startX - normalX * startRadius, startY - normalY * startRadius);
  linePath.closePath();
  context.fill(linePath);
}

function _drawHatchLayer(destRect:Rect, style:HatchLineStyle, context:CanvasRenderingContext2D) {
  // Validate the style contract before calculating hatch positions.
  assert(Number.isFinite(style.spacing) && style.spacing > 0);
  assert(Number.isFinite(style.angle));
  assert(Number.isFinite(style.lineWeightStart) && style.lineWeightStart >= 0);
  assert(Number.isFinite(style.lineWeightEnd) && style.lineWeightEnd >= 0);

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

  // Use canvas height for spacing at every angle, preserving hatch proportions.
  context.fillStyle = style.color;
  const spacingPixels = style.spacing * context.canvas.height;
  const lineCount = Math.floor((maxOffset - minOffset) / spacingPixels);
  for (let lineI = 0; lineI <= lineCount; ++lineI) {
    const offset = minOffset + lineI * spacingPixels;
    _drawTaperedHatchLine(destRect, style, direction, offset, context);
  }
}

// Draw hatch layers inside a rectangle in array order, with later layers on top.
export function hatchRect(destRect:Rect, styleNo:number, context:CanvasRenderingContext2D) {
  if (destRect.width === 0 || destRect.height === 0 || context.canvas.height === 0) return;

  const style = HATCH_STYLES[styleNo % HATCH_STYLES.length];

  // Share the rectangle clip across layers without changing the caller's current path.
  const clipPath = new Path2D();
  clipPath.rect(destRect.x, destRect.y, destRect.width, destRect.height);
  context.save();
  context.clip(clipPath);

  // Draw each layer with its own line style, then restore the caller's drawing state.
  for (const lineStyle of style.lineStyles) {
    _drawHatchLayer(destRect, lineStyle, context);
  }
  context.restore();
}