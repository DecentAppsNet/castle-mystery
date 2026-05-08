import Obstruction from "./types/Obstruction";
import Position, { duplicatePosition } from "./types/Position";
import Rect from "./types/Rect";
import Room from "./types/Room";

export const CHARACTER_OBSTRUCTION_MARGIN = 4;

const OBSTRUCTION_BACKOFF_DISTANCE = 1;
const EPSILON = 0.000001;

export type ObstructionBoundarySegment = {
  start:Position,
  end:Position
}

type MoveClipResult = {
  position:Position,
  wasClipped:boolean
}

function _isPositionInRect(x:number, y:number, rect:Rect):boolean {
  return x >= rect.x && x < rect.x + rect.width && y >= rect.y && y < rect.y + rect.height;
}

function _expandRect(rect:Rect, margin:number):Rect {
  return {
    x: rect.x - margin,
    y: rect.y - margin,
    width: rect.width + margin * 2,
    height: rect.height + margin * 2
  };
}

function _rectsCanMergeHorizontally(rect1:Rect, rect2:Rect):boolean {
  return rect1.y === rect2.y
    && rect1.height === rect2.height
    && rect1.x <= rect2.x + rect2.width
    && rect2.x <= rect1.x + rect1.width;
}

function _rectsCanMergeVertically(rect1:Rect, rect2:Rect):boolean {
  return rect1.x === rect2.x
    && rect1.width === rect2.width
    && rect1.y <= rect2.y + rect2.height
    && rect2.y <= rect1.y + rect1.height;
}

function _mergeRects(rect1:Rect, rect2:Rect):Rect {
  const left = Math.min(rect1.x, rect2.x);
  const top = Math.min(rect1.y, rect2.y);
  const right = Math.max(rect1.x + rect1.width, rect2.x + rect2.width);
  const bottom = Math.max(rect1.y + rect1.height, rect2.y + rect2.height);
  return { x:left, y:top, width:right - left, height:bottom - top };
}

function _dedupeSortedNumbers(values:number[]):number[] {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.filter((value, index) => index === 0 || Math.abs(value - sorted[index - 1]) > EPSILON);
}

function _isPointInAnyRect(x:number, y:number, rects:Rect[]):boolean {
  return rects.some(rect => _isPositionInRect(x, y, rect));
}

function _mergeBoundarySegments(segments:ObstructionBoundarySegment[]):ObstructionBoundarySegment[] {
  const horizontalSegments = new Map<number, Array<[number, number]>>();
  const verticalSegments = new Map<number, Array<[number, number]>>();

  segments.forEach(segment => {
    if (Math.abs(segment.start.y - segment.end.y) < EPSILON) {
      const y = segment.start.y;
      const startX = Math.min(segment.start.x, segment.end.x);
      const endX = Math.max(segment.start.x, segment.end.x);
      const ranges = horizontalSegments.get(y) || [];
      ranges.push([startX, endX]);
      horizontalSegments.set(y, ranges);
      return;
    }
    const x = segment.start.x;
    const startY = Math.min(segment.start.y, segment.end.y);
    const endY = Math.max(segment.start.y, segment.end.y);
    const ranges = verticalSegments.get(x) || [];
    ranges.push([startY, endY]);
    verticalSegments.set(x, ranges);
  });

  const mergedSegments:ObstructionBoundarySegment[] = [];
  horizontalSegments.forEach((ranges, y) => {
    ranges.sort((a, b) => a[0] - b[0]);
    let [currentStart, currentEnd] = ranges[0];
    for (let i = 1; i < ranges.length; ++i) {
      const [start, end] = ranges[i];
      if (start <= currentEnd + EPSILON) currentEnd = Math.max(currentEnd, end);
      else {
        mergedSegments.push({ start:{ x:currentStart, y }, end:{ x:currentEnd, y } });
        currentStart = start;
        currentEnd = end;
      }
    }
    mergedSegments.push({ start:{ x:currentStart, y }, end:{ x:currentEnd, y } });
  });
  verticalSegments.forEach((ranges, x) => {
    ranges.sort((a, b) => a[0] - b[0]);
    let [currentStart, currentEnd] = ranges[0];
    for (let i = 1; i < ranges.length; ++i) {
      const [start, end] = ranges[i];
      if (start <= currentEnd + EPSILON) currentEnd = Math.max(currentEnd, end);
      else {
        mergedSegments.push({ start:{ x, y:currentStart }, end:{ x, y:currentEnd } });
        currentStart = start;
        currentEnd = end;
      }
    }
    mergedSegments.push({ start:{ x, y:currentStart }, end:{ x, y:currentEnd } });
  });
  return mergedSegments;
}

export function normalizeObstructionRects(rects:Rect[]):Rect[] {
  const normalizedRects = rects
    .filter(rect => rect.width > 0 && rect.height > 0)
    .map(rect => ({ ...rect }));

  let didMerge = true;
  while (didMerge) {
    didMerge = false;
    for (let i = 0; i < normalizedRects.length && !didMerge; ++i) {
      for (let j = i + 1; j < normalizedRects.length; ++j) {
        const rect1 = normalizedRects[i];
        const rect2 = normalizedRects[j];
        if (!_rectsCanMergeHorizontally(rect1, rect2) && !_rectsCanMergeVertically(rect1, rect2)) continue;
        normalizedRects.splice(j, 1);
        normalizedRects[i] = _mergeRects(rect1, rect2);
        didMerge = true;
        break;
      }
    }
  }

  return normalizedRects;
}

export function createObstruction(rects:Rect[]):Obstruction {
  return { rects:normalizeObstructionRects(rects) };
}

export function createObstructionBoundarySegments(obstruction:Obstruction):ObstructionBoundarySegment[] {
  const xs = _dedupeSortedNumbers(obstruction.rects.flatMap(rect => [rect.x, rect.x + rect.width]));
  const ys = _dedupeSortedNumbers(obstruction.rects.flatMap(rect => [rect.y, rect.y + rect.height]));
  const segments:ObstructionBoundarySegment[] = [];

  for (let yI = 0; yI < ys.length - 1; ++yI) {
    for (let xI = 0; xI < xs.length - 1; ++xI) {
      const left = xs[xI];
      const right = xs[xI + 1];
      const top = ys[yI];
      const bottom = ys[yI + 1];
      const centerX = (left + right) / 2;
      const centerY = (top + bottom) / 2;
      if (!_isPointInAnyRect(centerX, centerY, obstruction.rects)) continue;

      const topInside = yI > 0 && _isPointInAnyRect(centerX, (ys[yI - 1] + top) / 2, obstruction.rects);
      const bottomInside = yI < ys.length - 2 && _isPointInAnyRect(centerX, (bottom + ys[yI + 2]) / 2, obstruction.rects);
      const leftInside = xI > 0 && _isPointInAnyRect((xs[xI - 1] + left) / 2, centerY, obstruction.rects);
      const rightInside = xI < xs.length - 2 && _isPointInAnyRect((right + xs[xI + 2]) / 2, centerY, obstruction.rects);

      if (!topInside) segments.push({ start:{ x:left, y:top }, end:{ x:right, y:top } });
      if (!bottomInside) segments.push({ start:{ x:right, y:bottom }, end:{ x:left, y:bottom } });
      if (!leftInside) segments.push({ start:{ x:left, y:bottom }, end:{ x:left, y:top } });
      if (!rightInside) segments.push({ start:{ x:right, y:top }, end:{ x:right, y:bottom } });
    }
  }

  return _mergeBoundarySegments(segments);
}

export function createObstructionBoundaryCorners(obstruction:Obstruction):Position[] {
  const corners = new Map<string, Position>();
  createObstructionBoundarySegments(obstruction).forEach(segment => {
    [segment.start, segment.end].forEach(point => {
      const key = `${point.x},${point.y}`;
      if (!corners.has(key)) corners.set(key, point);
    });
  });
  return Array.from(corners.values());
}

function _calcSegmentRectEntryT(from:Position, to:Position, rect:Rect):number|null {
  const minX = rect.x;
  const maxX = rect.x + rect.width;
  const minY = rect.y;
  const maxY = rect.y + rect.height;
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  let entryT = 0;
  let exitT = 1;
  const checks:[p:number, q:number][] = [
    [-dx, from.x - minX],
    [ dx, maxX - from.x],
    [-dy, from.y - minY],
    [ dy, maxY - from.y]
  ];

  for (const [p, q] of checks) {
    if (Math.abs(p) < EPSILON) {
      if (q < 0) return null;
      continue;
    }
    const t = q / p;
    if (p < 0) {
      entryT = Math.max(entryT, t);
    } else {
      exitT = Math.min(exitT, t);
    }
    if (entryT > exitT) return null;
  }

  if (entryT < 0 || entryT > 1) return null;
  return entryT;
}

export function isPositionInObstruction(x:number, y:number, obstruction:Obstruction):boolean {
  return obstruction.rects.some(rect => _isPositionInRect(x, y, rect));
}

export function isPositionInRoomObstruction(room:Room, x:number, y:number):boolean {
  return room.obstructions.some(obstruction => isPositionInObstruction(x, y, obstruction));
}

export function isPositionWithinRoomObstructionMargin(room:Room, x:number, y:number, margin:number = CHARACTER_OBSTRUCTION_MARGIN):boolean {
  return room.obstructions.some(obstruction => obstruction.rects.some(rect => _isPositionInRect(x, y, _expandRect(rect, margin))));
}

export function clipMoveToObstructions(room:Room, from:Position, to:Position):MoveClipResult {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  if (distance < EPSILON) return { position:duplicatePosition(to), wasClipped:false };

  let nearestEntryT:number|null = null;
  for (const obstruction of room.obstructions) {
    for (const rect of obstruction.rects) {
      const expandedRect = _expandRect(rect, CHARACTER_OBSTRUCTION_MARGIN);
      const entryT = _calcSegmentRectEntryT(from, to, expandedRect);
      if (entryT === null) continue;
      if (!_isPositionInRect(
        from.x + (to.x - from.x) * Math.min(1, entryT + 0.001),
        from.y + (to.y - from.y) * Math.min(1, entryT + 0.001),
        expandedRect
      )) continue;
      if (nearestEntryT === null || entryT < nearestEntryT) nearestEntryT = entryT;
    }
  }

  if (nearestEntryT === null) return { position:duplicatePosition(to), wasClipped:false };

  const backoffT = OBSTRUCTION_BACKOFF_DISTANCE / distance;
  let nextT = Math.max(0, nearestEntryT - backoffT);
  const decrementT = Math.max(backoffT, 1 / Math.max(distance, 1));

  while (nextT >= 0) {
    const candidate = {
      x:Math.round(from.x + (to.x - from.x) * nextT),
      y:Math.round(from.y + (to.y - from.y) * nextT)
    };
    if (!isPositionWithinRoomObstructionMargin(room, candidate.x, candidate.y)) {
      return { position:candidate, wasClipped:true };
    }
    if (nextT === 0) break;
    nextT = Math.max(0, nextT - decrementT);
  }

  return { position:duplicatePosition(from), wasClipped:true };
}