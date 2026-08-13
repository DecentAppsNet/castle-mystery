import { describe, expect, it } from 'vitest';

import { createKeyframeAtTime } from '@/game/timeline';

import defaultLevelText from './fixtures/ordering-base.md?raw';
import { loadLevelForTest, replaceSection } from './testLevelUtil';

describe('level loading - activity ordering', () => {
  it('schedules newly resolved relative activities around earlier absolute activities', () => {
    const text = replaceSection(defaultLevelText, 'itinerary', [
      '0:00:00 Sam sits',
      ': waits 3',
      ': stands',
      '0:00:01 Sam lays'
    ]);
    const { level, errors } = loadLevelForTest(text, 'ordering-relative-around-absolute.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const samI = level!.timeline.characterIdToI.sam;
    expect(createKeyframeAtTime(level!.timeline.keyframes, 0).characters[samI].bodyOrientation).toBe('sitting');
    expect(createKeyframeAtTime(level!.timeline.keyframes, 1_000).characters[samI].bodyOrientation).toBe('laying');
    expect(createKeyframeAtTime(level!.timeline.keyframes, 3_000).characters[samI].bodyOrientation).toBe('standing');
  });
});
