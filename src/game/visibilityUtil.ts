import Position from "./types/Position";
import Rect from "./types/Rect";

const EPSILON = 0.000001;

type RectBoundary = 'left' | 'right' | 'top' | 'bottom';
const RECT_BOUNDARIES:RectBoundary[] = ['left', 'right', 'top', 'bottom'];

function _normalizeAngle(angle:number):number {
  while (angle <= -Math.PI) angle += Math.PI * 2;
  while (angle > Math.PI) angle -= Math.PI * 2;
  return angle;
}

function _clipPolygonAgainstBoundary(points:Position[], rect:Rect, boundary:RectBoundary):Position[] {
  if (!points.length) return [];
  const result:Position[] = [];

  function _isInside(point:Position):boolean {
    switch(boundary) {
      case 'left': return point.x >= rect.x - EPSILON;
      case 'right': return point.x <= rect.x + rect.width + EPSILON;
      case 'top': return point.y >= rect.y - EPSILON;
      default: return point.y <= rect.y + rect.height + EPSILON;
    }
  }

  function _calcIntersection(start:Position, end:Position):Position {
    switch(boundary) {
      case 'left':
      case 'right': {
        const boundaryX = boundary === 'left' ? rect.x : rect.x + rect.width;
        const dx = end.x - start.x;
        const ratio = Math.abs(dx) < EPSILON ? 0 : (boundaryX - start.x) / dx;
        return { x: boundaryX, y: start.y + ratio * (end.y - start.y) };
      }

      case 'top':
      default: {
        const boundaryY = boundary === 'top' ? rect.y : rect.y + rect.height;
        const dy = end.y - start.y;
        const ratio = Math.abs(dy) < EPSILON ? 0 : (boundaryY - start.y) / dy;
        return { x: start.x + ratio * (end.x - start.x), y: boundaryY };
      }
    }
  }

  for (let i = 0; i < points.length; ++i) {
    const current = points[i];
    const previous = points[(i + points.length - 1) % points.length];
    const currentInside = _isInside(current);
    const previousInside = _isInside(previous);

    if (currentInside) {
      if (!previousInside) result.push(_calcIntersection(previous, current));
      result.push(current);
    } else if (previousInside) {
      result.push(_calcIntersection(previous, current));
    }
  }

  return result;
}

export function calcVisibilityPolygon(origin:Position, facingAngle:number, roomRect:Rect, coneAngle:number):Position[] {
  const farDistance = Math.hypot(roomRect.width, roomRect.height) * 2;
  const leftAngle = facingAngle - coneAngle / 2;
  const rightAngle = facingAngle + coneAngle / 2;
  const triangle:Position[] = [
    origin,
    {
      x: origin.x + Math.cos(leftAngle) * farDistance,
      y: origin.y + Math.sin(leftAngle) * farDistance
    },
    {
      x: origin.x + Math.cos(rightAngle) * farDistance,
      y: origin.y + Math.sin(rightAngle) * farDistance
    }
  ];

  return RECT_BOUNDARIES.reduce(
    (points, boundary) => _clipPolygonAgainstBoundary(points, roomRect, boundary),
    triangle
  );
}

export function isPositionInVisibilityCone(origin:Position, position:Position, facingAngle:number, coneAngle:number):boolean {
  const dx = position.x - origin.x;
  const dy = position.y - origin.y;
  if (Math.abs(dx) < EPSILON && Math.abs(dy) < EPSILON) return true;
  const targetAngle = Math.atan2(dy, dx);
  const angleDelta = _normalizeAngle(targetAngle - facingAngle);
  return Math.abs(angleDelta) <= coneAngle / 2 + EPSILON;
}