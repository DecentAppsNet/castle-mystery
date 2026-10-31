import { assertNonNullable } from 'decent-portal';
import { describe, expect, it } from 'vitest';

import { setSeed } from '@/common/randUtil';
import CharacterEffectDrawContext from '@/game/effects/types/CharacterEffectDrawContext';
import { createKeyframeAtTime } from '@/game/timeline';
import { BodyOrientation } from '@/game/types/Character';
import ScalingFactors from '@/game/types/ScalingFactors';
import sameTimeText from './fixtures/speech-gestures-same-time.md?raw';
import { loadValidLevelForTest } from './testLevelUtil';

describe('level loading - speech gestures', () => {
  it('uses a later-authored same-time posture without losing targeted facing', () => {
    setSeed(407);
    const level = loadValidLevelForTest(sameTimeText);
    const samI = level.timeline.characterIdToI.sam;
    const speaker = createKeyframeAtTime(level.timeline.keyframes, 0).characters[samI];
    expect(speaker.bodyOrientation).toBe('laying');
    expect(speaker.facingDirection).toBe('left');
    const effect = speaker.effects.find(candidate => candidate.kind === 'says');
    assertNonNullable(effect);
    const handler = effect.handler;
    assertNonNullable(handler);
    const sample = (time:number, bodyOrientation:BodyOrientation) => handler({
      stage:'beforeCharacter', characterContext:{ bodyOrientation } as CharacterEffectDrawContext
    }, {} as ScalingFactors, time, 0, {} as CanvasRenderingContext2D);
    const time = Array.from({ length:Math.floor(effect.endTime / 100) }, (_, timeI) => timeI * 100)
      .find(candidate => sample(candidate, speaker.bodyOrientation)?.spriteOverrides.length === 3);
    assertNonNullable(time);

    const currentSpeaker = createKeyframeAtTime(level.timeline.keyframes, time).characters[samI];
    const currentResult = sample(time, currentSpeaker.bodyOrientation);
    const standingResult = sample(time, 'standing');
    expect(currentResult).not.toEqual(standingResult);
    expect(currentResult?.spriteOverrides.find(override => override.spriteKind === 'head'))
      .toEqual(standingResult?.spriteOverrides.find(override => override.spriteKind === 'head'));
    expect(sample(time, currentSpeaker.bodyOrientation)).toEqual(currentResult);
    expect(level.timeline.endTime).toBe(effect.endTime);
  });
});