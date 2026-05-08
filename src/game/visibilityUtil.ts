import Obstruction from "./types/Obstruction";
import Position from "./types/Position";
import Rect from "./types/Rect";
import Room from "./types/Room";
import { createObstructionBoundaryCorners, createObstructionBoundarySegments } from "./obstructionUtil";

const EPSILON = 0.000001;
const ANGLE_EPSILON = 0.0001;

type Segment = {
  start:Position,
  end:Position
}

type RayHit = {
  point:Position,
  distance:number
}

function _normalizeAngle(angle:number):number {
  while (angle <= -Math.PI) angle += Math.PI * 2;
  while (angle > Math.PI) angle -= Math.PI * 2;
  return angle;
}

function _crossProduct(a:Position, b:Position):number {
  return a.x * b.y - a.y * b.x;
}

function _isPositionInRect(position:Position, rect:Rect):boolean {
  return position.x >= rect.x - EPSILON
    && position.x <= rect.x + rect.width + EPSILON
    && position.y >= rect.y - EPSILON
    && position.y <= rect.y + rect.height + EPSILON;
}

function _isPositionInObstruction(position:Position, obstruction:Obstruction):boolean {
  return obstruction.rects.some(rect => _isPositionInRect(position, rect));
}

function _isOriginInsideRoomObstruction(origin:Position, room:Room):boolean {
  return room.obstructions.some(obstruction => _isPositionInObstruction(origin, obstruction));
}

function _isAngleInsideCone(angle:number, facingAngle:number, coneAngle:number):boolean {
  const angleDelta = _normalizeAngle(angle - facingAngle);
  return Math.abs(angleDelta) <= coneAngle / 2 + ANGLE_EPSILON;
}

function _createRectSegments(rect:Rect):Segment[] {
  const left = rect.x;
  const right = rect.x + rect.width;
  const top = rect.y;
  const bottom = rect.y + rect.height;
  return [
    { start:{x:left, y:top}, end:{x:right, y:top} },
    { start:{x:right, y:top}, end:{x:right, y:bottom} },
    { start:{x:right, y:bottom}, end:{x:left, y:bottom} },
    { start:{x:left, y:bottom}, end:{x:left, y:top} }
  ];
}

function _createRectCorners(rect:Rect):Position[] {
  return [
    {x:rect.x, y:rect.y},
    {x:rect.x + rect.width, y:rect.y},
    {x:rect.x + rect.width, y:rect.y + rect.height},
    {x:rect.x, y:rect.y + rect.height}
  ];
}

function _createVisibilitySegments(room:Room):Segment[] {
  return [
    ..._createRectSegments(room.rect),
    ...room.obstructions.flatMap(obstruction => createObstructionBoundarySegments(obstruction))
  ];
}

function _createCandidateAngles(origin:Position, facingAngle:number, room:Room, coneAngle:number):number[] {
  const angles = [facingAngle - coneAngle / 2, facingAngle + coneAngle / 2];
  const points = [
    ..._createRectCorners(room.rect),
    ...room.obstructions.flatMap(obstruction => createObstructionBoundaryCorners(obstruction))
  ];

  points.forEach(point => {
    const angle = Math.atan2(point.y - origin.y, point.x - origin.x);
    if (!_isAngleInsideCone(angle, facingAngle, coneAngle)) return;
    angles.push(angle - ANGLE_EPSILON, angle, angle + ANGLE_EPSILON);
  });

  return angles.filter(angle => _isAngleInsideCone(angle, facingAngle, coneAngle));
}

function _castRayToSegment(origin:Position, angle:number, segment:Segment):RayHit|null {
  const rayVector = { x:Math.cos(angle), y:Math.sin(angle) };
  const segmentVector = { x:segment.end.x - segment.start.x, y:segment.end.y - segment.start.y };
  const denominator = _crossProduct(rayVector, segmentVector);
  if (Math.abs(denominator) < EPSILON) return null;

  const originToSegment = { x:segment.start.x - origin.x, y:segment.start.y - origin.y };
  const rayT = _crossProduct(originToSegment, segmentVector) / denominator;
  const segmentT = _crossProduct(originToSegment, rayVector) / denominator;
  if (rayT < 0 || segmentT < -EPSILON || segmentT > 1 + EPSILON) return null;

  return {
    point:{ x:origin.x + rayVector.x * rayT, y:origin.y + rayVector.y * rayT },
    distance:rayT
  };
}

function _castVisibilityRay(origin:Position, angle:number, room:Room):Position {
  const segments = _createVisibilitySegments(room);
  let nearestHit:RayHit|null = null;

  for (const segment of segments) {
    const hit = _castRayToSegment(origin, angle, segment);
    if (!hit) continue;
    if (!nearestHit || hit.distance < nearestHit.distance) nearestHit = hit;
  }

  if (nearestHit) return nearestHit.point;
  return origin;
}

function _dedupePolygonPoints(points:Position[]):Position[] {
  const deduped:Position[] = [];
  points.forEach(point => {
    const previous = deduped[deduped.length - 1];
    if (previous && Math.hypot(previous.x - point.x, previous.y - point.y) < EPSILON) return;
    deduped.push(point);
  });
  if (deduped.length > 1) {
    const first = deduped[0];
    const last = deduped[deduped.length - 1];
    if (Math.hypot(first.x - last.x, first.y - last.y) < EPSILON) deduped.pop();
  }
  return deduped;
}

export function calcVisibilityPolygon(origin:Position, facingAngle:number, room:Room, coneAngle:number):Position[] {
  if (_isOriginInsideRoomObstruction(origin, room)) return [];
  const candidateAngles = _createCandidateAngles(origin, facingAngle, room, coneAngle)
    .sort((a, b) => _normalizeAngle(a - facingAngle) - _normalizeAngle(b - facingAngle));
  const boundaryPoints = candidateAngles.map(angle => _castVisibilityRay(origin, angle, room));
  return _dedupePolygonPoints([origin, ...boundaryPoints]);
}

export function isPositionVisible(origin:Position, position:Position, facingAngle:number, room:Room, coneAngle:number):boolean {
  if (_isOriginInsideRoomObstruction(origin, room)) return false;
  if (!_isPositionInRect(position, room.rect)) return false;
  if (room.obstructions.some(obstruction => _isPositionInObstruction(position, obstruction))) return false;
  const dx = position.x - origin.x;
  const dy = position.y - origin.y;
  if (Math.abs(dx) < EPSILON && Math.abs(dy) < EPSILON) return true;

  const angle = Math.atan2(dy, dx);
  if (!_isAngleInsideCone(angle, facingAngle, coneAngle)) return false;
  const hitPosition = _castVisibilityRay(origin, angle, room);
  const targetDistance = Math.hypot(dx, dy);
  const hitDistance = Math.hypot(hitPosition.x - origin.x, hitPosition.y - origin.y);
  return hitDistance + EPSILON >= targetDistance;
}