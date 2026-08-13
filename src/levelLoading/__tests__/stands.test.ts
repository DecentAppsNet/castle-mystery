import { describe, expect, it } from 'vitest';

import { createCharacterKeyframeAtTime } from '@/game/timeline';

import defaultLevelText from './fixtures/stands-base.md?raw';
import { loadLevelForTest, replaceSection } from './testLevelUtil';

function _loadSamBodyOrientation(itineraryLines:readonly string[], time:number) {
  const text = replaceSection(defaultLevelText, 'itinerary', itineraryLines);
  const { level, errors } = loadLevelForTest(text, 'stands.md');

  expect(errors.describeErrors()).toBe('');
  expect(level).not.toBeNull();
  const samI = level!.timeline.characterIdToI.sam;
  return createCharacterKeyframeAtTime(level!.timeline.keyframes, samI, time).bodyOrientation;
}

describe('level loading - stands activities', () => {
  it('loads stands activity with an absolute timestamp', () => {
    const bodyOrientation = _loadSamBodyOrientation([
      '0:00:00 Sam sits',
      '0:00:01 Sam stands'
    ], 1_000);

    expect(bodyOrientation).toBe('standing');
  });

  it('loads stands activity with a relative timestamp', () => {
    const bodyOrientation = _loadSamBodyOrientation([
      '0:00:00 Sam waits 1',
      ': stands'
    ], 1_000);

    expect(bodyOrientation).toBe('standing');
  });

  it('stands activity with implied subject defaults to active character', () => {
    const bodyOrientation = _loadSamBodyOrientation(['0:00:00 stands'], 0);

    expect(bodyOrientation).toBe('standing');
  });
});
