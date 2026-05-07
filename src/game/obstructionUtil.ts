import Obstruction from "./types/Obstruction";
import Position, { duplicatePosition } from "./types/Position";
import Rect from "./types/Rect";
import Room from "./types/Room";

export const CHARACTER_OBSTRUCTION_MARGIN = 4;

const OBSTRUCTION_BACKOFF_DISTANCE = 1;
const EPSILON = 0.000001;

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
  return _isPositionInRect(x, y, obstruction.rect);
}

export function isPositionInRoomObstruction(room:Room, x:number, y:number):boolean {
  return room.obstructions.some(obstruction => isPositionInObstruction(x, y, obstruction));
}

export function isPositionWithinRoomObstructionMargin(room:Room, x:number, y:number, margin:number = CHARACTER_OBSTRUCTION_MARGIN):boolean {
  return room.obstructions.some(obstruction => _isPositionInRect(x, y, _expandRect(obstruction.rect, margin)));
}

export function clipMoveToObstructions(room:Room, from:Position, to:Position):MoveClipResult {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  if (distance < EPSILON) return { position:duplicatePosition(to), wasClipped:false };

  let nearestEntryT:number|null = null;
  for (const obstruction of room.obstructions) {
    const expandedRect = _expandRect(obstruction.rect, CHARACTER_OBSTRUCTION_MARGIN);
    const entryT = _calcSegmentRectEntryT(from, to, expandedRect);
    if (entryT === null) continue;
    if (!_isPositionInRect(
      from.x + (to.x - from.x) * Math.min(1, entryT + 0.001),
      from.y + (to.y - from.y) * Math.min(1, entryT + 0.001),
      expandedRect
    )) continue;
    if (nearestEntryT === null || entryT < nearestEntryT) nearestEntryT = entryT;
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