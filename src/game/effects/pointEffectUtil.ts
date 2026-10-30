/* This file creates deterministic three-stage pointing effects with relative near-arm rotation.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assert } from 'decent-portal';
import { clamp } from '@/common/numberUtil';
import Effect from './types/Effect';
import EffectHandler, { EffectHandlerResult } from './types/EffectHandler';
import EffectDrawCall from './types/EffectDrawCall';

const POINT_TIMINGS = {
  quickly:{ pointing:100, pointed:300, resting:100 },
  default:{ pointing:200, pointed:600, resting:200 },
  slowly:{ pointing:400, pointed:1200, resting:400 }
} as const;

export function getPointTiming(speed:'quickly'|'slowly'|null = null) {
  const stages = POINT_TIMINGS[speed ?? 'default'];
  return { ...stages, duration:stages.pointing + stages.pointed + stages.resting } as const;
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
    { spriteKind:'nearArm', transformType:'rotate', rotateRadians:progress === 0 ? 0 : relativeAngle * progress }
  ] };
}

export function createPointEffect(startTime:number, relativeAngle:number,
    speed:'quickly'|'slowly'|null = null):Effect {
  assert(Number.isFinite(startTime) && Number.isFinite(relativeAngle));
  const { pointing, pointed, resting, duration } = getPointTiming(speed);
  const endTime = startTime + duration;

  const handler:EffectHandler = (drawCall, _scalingFactors, time) => {
    return _handlePointEffect(drawCall, time, startTime, pointing, pointed, resting, duration, relativeAngle);
  };

  return { kind:'point', startTime, endTime, handler };
}