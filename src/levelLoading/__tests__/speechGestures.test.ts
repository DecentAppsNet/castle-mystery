import { describe, expect, it } from 'vitest';

import { setSeed } from '@/common/randUtil';
import { createKeyframeAtTime } from '@/game/timeline';
import { BodyOrientation } from '@/game/types/Character';
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
    const foundEffect = speaker.effects.find(candidate => candidate.kind === 'says');
    expect(foundEffect).toBeDefined();
    const effect = foundEffect!;
    const handler = effect.anatomyHandler;
    expect(handler).toEqual(expect.any(Function));
    const sample = (time:number, bodyOrientation:BodyOrientation) => handler!({
      bodyOrientation, isNearArmHoldingItem:false, isFarArmHoldingItem:false
    }, time, 0);
    const time = Array.from({ length:Math.floor(effect.endTime / 100) }, (_, timeI) => timeI * 100)
      .find(candidate => sample(candidate, speaker.bodyOrientation).some(override => override.spriteKind !== 'head'));
    expect(time).toBeDefined();

    const currentSpeaker = createKeyframeAtTime(level.timeline.keyframes, time!).characters[samI];
    const currentResult = sample(time!, currentSpeaker.bodyOrientation);
    const standingResult = sample(time!, 'standing');
    expect(currentResult).not.toEqual(standingResult);
    expect(currentResult.find(override => override.spriteKind === 'head'))
      .toEqual(standingResult.find(override => override.spriteKind === 'head'));
    expect(sample(time!, currentSpeaker.bodyOrientation)).toEqual(currentResult);
    expect(level.timeline.endTime).toBe(effect.endTime);
  });
});