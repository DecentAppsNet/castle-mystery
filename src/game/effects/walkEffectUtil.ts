/* This file creates deterministic timeline-based walking effects with relative leg translations.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assert } from 'decent-portal';
import { clamp } from '@/common/numberUtil';
import Effect from './types/Effect';
import EffectHandler from './types/EffectHandler';

const WALK_LEG_LIFT_RATIO = 0.2;
const WALK_CYCLE_DURATION_MSECS = 600;
const WALK_FADE_DURATION_MSECS = 150;

function _smoothstep(progress:number):number {
  const clamped = clamp(progress, 0, 1);
  return clamped * clamped * (3 - 2 * clamped);
}

export function createWalkEffect(startTime:number, endTime:number):Effect {
  assert(Number.isFinite(startTime) && Number.isFinite(endTime) && endTime > startTime);
  const duration = endTime - startTime;
  const fadeDuration = Math.min(WALK_FADE_DURATION_MSECS, duration / 2);

  const handler:EffectHandler = (drawCall, _scalingFactors, time) => {
    if (drawCall.stage !== 'beforeCharacter') return null;
    const elapsed = clamp(time - startTime, 0, duration);
    const envelope = _smoothstep(elapsed / fadeDuration) * _smoothstep((duration - elapsed) / fadeDuration);
    const phase = elapsed * 2 * Math.PI / WALK_CYCLE_DURATION_MSECS;
    const liftRatio = WALK_LEG_LIFT_RATIO * envelope;
    return { spriteOverrides:[
      { spriteKind:'leftLeg', transformType:'translatePartHeight',
        translateHeightRatio:liftRatio === 0 ? 0 : -liftRatio * (1 + Math.sin(phase)) / 2 },
      { spriteKind:'rightLeg', transformType:'translatePartHeight',
        translateHeightRatio:liftRatio === 0 ? 0 : -liftRatio * (1 - Math.sin(phase)) / 2 }
    ] };
  };

  return { kind:'walk', startTime, endTime, handler };
}