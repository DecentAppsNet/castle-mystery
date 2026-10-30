/* This file creates deterministic three-stage pointing effects with viewer-front-arm rotation.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assert, assertNonNullable } from 'decent-portal';
import { clamp } from '@/common/numberUtil';
import { createBodyPose, getResolvedBodyPart, getViewerArmPartKind, transformBodyPoint } from '@/game/characterBody';
import Character from '@/game/types/Character';
import Point from '@/game/types/Point';
import PartKind from '@/game/characterBody/types/PartKind';
import { createRoomContentDisplayLayout, RoomContentDisplayLayout } from '@/game/roomContentDisplayPositionUtil';
import { findRoomAtPosition } from '@/game/roomUtil';
import { ITEM_CUBOID_HEIGHT_GAME } from '@/game/itemSizeUtil';
import PointStartSnapshot from './types/PointStartSnapshot';
import Effect from './types/Effect';
import EffectHandler, { EffectHandlerResult } from './types/EffectHandler';
import EffectDrawCall from './types/EffectDrawCall';

const POINT_TIMINGS = {
  quickly:{ pointing:100, pointed:300, resting:100 },
  default:{ pointing:200, pointed:600, resting:200 },
  slowly:{ pointing:400, pointed:1200, resting:400 }
} as const;

export function getPointDuration(speed:'quickly'|'slowly'|null = null):number {
  const stages = POINT_TIMINGS[speed ?? 'default'];
  return stages.pointing + stages.pointed + stages.resting;
}

function _characterPoint(character:Character, kind:PartKind, layout:RoomContentDisplayLayout, pivot:boolean = false):Point {
  const resolved = getResolvedBodyPart(createBodyPose(character.rootBodyPart,
    character.bodyOrientation, character.facingDirection), kind);
  const local = pivot ? resolved.part.pivotPoint : [resolved.part.width / 2, resolved.part.height / 2] as Point;
  const point = transformBodyPoint(resolved.transform, local);
  const entry = layout.characterLayoutById.get(character.id);
  assertNonNullable(entry);
  return [point[0] + entry.displayPosition.x, point[1] + entry.displayPosition.y];
}

function _findPointAngle(snapshot:PointStartSnapshot):number|null {
  const { subject, room, characters, target, movingCharacterIds } = snapshot;
  const inRoom = characters.filter(character =>
    findRoomAtPosition([room], character.position.x, character.position.y) !== null);
  const layout = createRoomContentDisplayLayout(room, inRoom, movingCharacterIds);
  const armKind = getViewerArmPartKind(subject, 'viewerFrontArm');
  const pivot = _characterPoint(subject, armKind, layout, true);
  let vector:Point;

  if (target.kind === 'direction') {
    const directions:{ readonly [direction:string]:Point|undefined } = {
      left:[-1, 0], right:[1, 0], up:[0, -1], down:[0, 1],
      upleft:[-1, -1], upright:[1, -1], downleft:[-1, 1], downright:[1, 1]
    };
    const direction = directions[target.direction];
    assertNonNullable(direction);
    vector = direction;
  } else {
    let center:Point;
    if (target.kind === 'item') {
      const entry = layout.itemLayoutById.get(target.itemId);
      assertNonNullable(entry);
      center = [entry.displayPosition.x, entry.displayPosition.y - ITEM_CUBOID_HEIGHT_GAME / 2];
    } else {
      const characterId = target.kind === 'character' ? target.characterId : target.holderId;
      const character = characters.find(candidate => candidate.id === characterId);
      assertNonNullable(character);
      center = _characterPoint(character, target.kind === 'character' ? 'head' : 'torso', layout);
    }
    vector = [center[0] - pivot[0], center[1] - pivot[1]];
    const tolerance = Number.EPSILON * Math.max(1, ...center.map(Math.abs), ...pivot.map(Math.abs)) * 4;
    if (Math.hypot(...vector) <= tolerance) return null;
  }

  const { transform } = getResolvedBodyPart(createBodyPose(subject.rootBodyPart,
    subject.bodyOrientation, subject.facingDirection), armKind);
  const localX = vector[0] * transform.horizontalX + vector[1] * transform.horizontalY;
  const localY = vector[0] * transform.verticalX + vector[1] * transform.verticalY;
  const angle = Math.atan2(-localX, localY);
  return angle === -Math.PI ? Math.PI : angle;
}

function _smoothstep(progress:number):number {
  const clamped = clamp(progress, 0, 1);
  return clamped * clamped * (3 - 2 * clamped);
}

function _handlePointEffect(drawCall:EffectDrawCall, time:number, startTime:number, pointingDuration:number, 
    pointedDuration:number, restingDuration:number, totalDuration:number, relativeAngle:number):EffectHandlerResult|null{
  if (drawCall.stage !== 'beforeCharacter') return null;
  const elapsed = clamp(time - startTime, 0, totalDuration);
  const progress = elapsed < pointingDuration ? _smoothstep(elapsed / pointingDuration)
    : elapsed <= pointingDuration + pointedDuration ? 1 : _smoothstep((totalDuration - elapsed) / restingDuration);
  return { spriteOverrides:[
    { spriteKind:'viewerFrontArm', transformType:'rotate', rotateRadians:progress === 0 ? 0 : relativeAngle * progress }
  ] };
}

export function createPointEffect(startTime:number, snapshot:PointStartSnapshot,
    speed:'quickly'|'slowly'|null = null):Effect|null {
  assert(Number.isFinite(startTime));
  const relativeAngle = _findPointAngle(snapshot);
  if (relativeAngle === null) return null;
  const { pointing, pointed, resting } = POINT_TIMINGS[speed ?? 'default'];
  const duration = getPointDuration(speed);
  const endTime = startTime + duration;

  const handler:EffectHandler = (drawCall, _scalingFactors, time) => {
    return _handlePointEffect(drawCall, time, startTime, pointing, pointed, resting, duration, relativeAngle);
  };

  return { kind:'point', startTime, endTime, handler };
}