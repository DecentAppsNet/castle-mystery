import { clearSeed, isSeeded, rand, setSeed } from "@/common/randUtil";
import Point from "@/game/types/Point";
import Rect from "@/game/types/Rect";
import { assert } from "decent-portal";

const INK_LINE_POINT_OFFSET_RANGE_PERCENT = .10; // % of container height.
const SPLOTCH_CHANCE = .2; // 1 = 100%
const SPLOTCH_RADIUS_RANGE_PERCENT = .075; // % of container height.
const SPLOTCH_ORTHOGONAL_OFFSET_RANGE_PERCENT = .20; // % of container height.
const MAX_SPLOTCHES = 2;

const MAX_TALLY_MARK_COUNT = 25;
const MARKS_IN_GROUP = 5;
const MAX_GROUP_COUNT = Math.ceil(MAX_TALLY_MARK_COUNT / MARKS_IN_GROUP);
const GROUP_GAP_PERCENT = .05; // % of container width.
const GROUP_WIDTH_PERCENT = (1 - GROUP_GAP_PERCENT * (MAX_GROUP_COUNT - 1)) / MAX_GROUP_COUNT; // % of container width.

function _calcInkLinePointOffset(point:Point, offsetRange:number):Point {
  return [
    point[0] + offsetRange * (rand() - .5),
    point[1] + offsetRange * (rand() - .5)
  ];
}

function _drawInkLine(from:Point, to:Point, rowHeight:number, colorHex:string, context:CanvasRenderingContext2D):void {
  /* To mimic an ink stroke, set up polygonal points in a teardrop swath shape.

               2        3
      1                    4
               6        5

  1 = from point
  4 = to point
  2, 6 = point that is 50% of distance along the ray from 1 to 4 and orthogonally offset to left or right of ray.
  3, 5 = point that is 90% of distance along the ray from 1 to 4 and orthogonally offset to left or right of ray.
  */
  const deltaX = to[0] - from[0];
  const deltaY = to[1] - from[1];
  const length = Math.hypot(deltaX, deltaY);
  assert(length > 0);
  const orthogonal:Point = [-deltaY / length, deltaX / length];
  const pointOffsetRange = rowHeight * INK_LINE_POINT_OFFSET_RANGE_PERCENT;
  const strokeRadius = pointOffsetRange / 2;
  const midpoint:Point = [from[0] + deltaX / 2, from[1] + deltaY / 2];
  const nearEnd:Point = [from[0] + deltaX * .9, from[1] + deltaY * .9];
  const points = [
    from,
    [midpoint[0] + orthogonal[0] * strokeRadius, midpoint[1] + orthogonal[1] * strokeRadius] as Point,
    [nearEnd[0] + orthogonal[0] * strokeRadius, nearEnd[1] + orthogonal[1] * strokeRadius] as Point,
    to,
    [nearEnd[0] - orthogonal[0] * strokeRadius, nearEnd[1] - orthogonal[1] * strokeRadius] as Point,
    [midpoint[0] - orthogonal[0] * strokeRadius, midpoint[1] - orthogonal[1] * strokeRadius] as Point
  ].map(point => _calcInkLinePointOffset(point, pointOffsetRange));

  // Fill the ink-stroke polygon without changing the caller's canvas state.
  context.save();
  context.fillStyle = colorHex;
  context.beginPath();
  context.moveTo(points[0][0], points[0][1]);
  for (const point of points.slice(1)) context.lineTo(point[0], point[1]);
  context.closePath();
  context.fill();

  // Scatter occasional ink splotches on either side of the stroke.
  for (let splotchChanceI = 0; splotchChanceI < MAX_SPLOTCHES; ++splotchChanceI) {
    if (rand() < SPLOTCH_CHANCE) {
      const rayPosition = rand();
      const orthogonalOffset = (rand() - .5) * rowHeight * SPLOTCH_ORTHOGONAL_OFFSET_RANGE_PERCENT;
      const x = from[0] + deltaX * rayPosition + orthogonal[0] * orthogonalOffset;
      const y = from[1] + deltaY * rayPosition + orthogonal[1] * orthogonalOffset;
      const radius = rand() * rowHeight * SPLOTCH_RADIUS_RANGE_PERCENT;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    }
  }
  context.restore();
}

const MAX_VERTICAL_MARK_COUNT = 4;
function _drawTallyMarkGroup(count:number, rect:Rect, colorHex:string, context:CanvasRenderingContext2D) {
  assert(count <= MARKS_IN_GROUP);
  const verticalMarkCount = Math.min(count, MAX_VERTICAL_MARK_COUNT);
  const gapWidth = rect.width / MAX_VERTICAL_MARK_COUNT;
  const bottom = rect.y + rect.height;
  for (let verticalMarkI = 0; verticalMarkI < verticalMarkCount; ++verticalMarkI) {
    const x = rect.x + (verticalMarkI + .5) * gapWidth;
    _drawInkLine([x, rect.y], [x, bottom], rect.height, colorHex, context);
  }
  if (count === MARKS_IN_GROUP) _drawInkLine([rect.x + rect.width, rect.y], [rect.x, bottom], rect.height, colorHex, context);
}

function _calcGroupRect(groupI:number, containerRect:Rect):Rect {
  const groupGap = containerRect.width * GROUP_GAP_PERCENT;
  const width = containerRect.width * GROUP_WIDTH_PERCENT;
  const x = containerRect.x + groupI * (width + groupGap);
  return { x, y:containerRect.y, width, height:containerRect.height };
}

/*
  This function draws Roman-style tally marks with 4 vertical unit marks and one diagonal crossing mark in groups of 5.
  The style mimics hand-drawn marks with a permanent layout such that adding to the count will produce a drawing 
  that would contain consistent placement of earlier marks used for a lower count. The layout is based on drawing a 
  maximum of 25 marks, with up to 5 groups added from left to right.

  The salt param allows for repeatable diffferences in how lines are drawn.

  Returns number of marks that couldn't be drawn after drawing the maximum inside the rect.
*/
export function drawTallyMarks(count:number, rect:Rect, colorHex:string, context:CanvasRenderingContext2D, salt:number = 0):number {
  // Set the seed to allow consistent marks to be drawn. The consistency depends on the same psuedo-random sequence being
  // applied to the same drawing calculations, so the algorithm must keep the same order of drawing marks from one count value
  // to the next.
  const wasSeeded = isSeeded();
  setSeed(salt);

  const originalCount = count;
  if (count > MAX_TALLY_MARK_COUNT) count = MAX_TALLY_MARK_COUNT;

  const fullGroupCount = Math.floor(count / MARKS_IN_GROUP);
  let groupI = 0;
  for(; groupI < fullGroupCount; ++groupI) {
    const groupRect = _calcGroupRect(groupI, rect);
    _drawTallyMarkGroup(MARKS_IN_GROUP, groupRect, colorHex, context);
  }

  const remainingMarks = count % MARKS_IN_GROUP;
  if (remainingMarks) {
    const groupRect = _calcGroupRect(groupI, rect);
    _drawTallyMarkGroup(remainingMarks, groupRect, colorHex, context);
  }

  if (!wasSeeded) clearSeed();
  
  return originalCount - count;
}