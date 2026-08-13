import { describe, expect, it } from 'vitest';

import { createCharacterKeyframeAtTime } from '@/game/timeline';

import defaultLevelText from './fixtures/lays-base.md?raw';
import { loadLevelForTest, replaceSection } from './testLevelUtil';

function _loadSamBodyOrientation(itineraryLines:readonly string[], time:number) {
  const text = replaceSection(defaultLevelText, 'itinerary', itineraryLines);
  const { level, errors } = loadLevelForTest(text, 'lays.md');

  expect(errors.describeErrors()).toBe('');
  expect(level).not.toBeNull();
  const samI = level!.timeline.characterIdToI.sam;
  return createCharacterKeyframeAtTime(level!.timeline.keyframes, samI, time).bodyOrientation;
}

describe('level loading - lays activities', () => {
  it('loads lays activity with an absolute timestamp', () => {
    const bodyOrientation = _loadSamBodyOrientation([
      '0:00:00 Sam stands',
      '0:00:01 Sam lays'
    ], 1_000);

    expect(bodyOrientation).toBe('laying');
  });

  it('loads lays activity with a relative timestamp', () => {
    const bodyOrientation = _loadSamBodyOrientation([
      '0:00:00 Sam waits 1',
      ': lays'
    ], 1_000);

    expect(bodyOrientation).toBe('laying');
  });

  it('lays activity with implied subject defaults to active character', () => {
    const bodyOrientation = _loadSamBodyOrientation(['0:00:00 lays'], 0);

    expect(bodyOrientation).toBe('laying');
  });
});
