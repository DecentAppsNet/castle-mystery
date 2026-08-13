import { describe, expect, it } from 'vitest';

import { createCharacterKeyframeAtTime } from '@/game/timeline';

import defaultLevelText from './fixtures/kneels-base.md?raw';
import { loadLevelForTest, replaceSection } from './testLevelUtil';

function _loadSamBodyOrientation(itineraryLines:readonly string[], time:number) {
  const text = replaceSection(defaultLevelText, 'itinerary', itineraryLines);
  const { level, errors } = loadLevelForTest(text, 'kneels.md');

  expect(errors.describeErrors()).toBe('');
  expect(level).not.toBeNull();
  const samI = level!.timeline.characterIdToI.sam;
  return createCharacterKeyframeAtTime(level!.timeline.keyframes, samI, time).bodyOrientation;
}

describe('level loading - kneels activities', () => {
  it('loads kneels activity with an absolute timestamp', () => {
    const bodyOrientation = _loadSamBodyOrientation([
      '0:00:00 Sam stands',
      '0:00:01 Sam kneels'
    ], 1_000);

    expect(bodyOrientation).toBe('kneeling');
  });

  it('loads kneels activity with a relative timestamp', () => {
    const bodyOrientation = _loadSamBodyOrientation([
      '0:00:00 Sam waits 1',
      ': kneels'
    ], 1_000);

    expect(bodyOrientation).toBe('kneeling');
  });

  it('kneels activity with implied subject defaults to active character', () => {
    const bodyOrientation = _loadSamBodyOrientation(['0:00:00 kneels'], 0);

    expect(bodyOrientation).toBe('kneeling');
  });
});
