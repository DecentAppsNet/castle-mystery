import { describe, expect, it } from 'vitest';

import { createCharacterKeyframeAtTime } from '@/game/timeline';

import defaultLevelText from './fixtures/sits-base.md?raw';
import { loadLevelForTest, replaceSection } from './testLevelUtil';

function _loadSamBodyOrientation(itineraryLines:readonly string[], time:number) {
  const text = replaceSection(defaultLevelText, 'itinerary', itineraryLines);
  const { level, errors } = loadLevelForTest(text, 'sits.md');

  expect(errors.describeErrors()).toBe('');
  expect(level).not.toBeNull();
  const samI = level!.timeline.characterIdToI.sam;
  return createCharacterKeyframeAtTime(level!.timeline.keyframes, samI, time).bodyOrientation;
}

describe('level loading - sits activities', () => {
  it('loads sits activity with an absolute timestamp', () => {
    const bodyOrientation = _loadSamBodyOrientation([
      '0:00:00 Sam stands',
      '0:00:01 Sam sits'
    ], 1_000);

    expect(bodyOrientation).toBe('sitting');
  });

  it('loads sits activity with a relative timestamp', () => {
    const bodyOrientation = _loadSamBodyOrientation([
      '0:00:00 Sam waits 1',
      ': sits'
    ], 1_000);

    expect(bodyOrientation).toBe('sitting');
  });

  it('sits activity with implied subject defaults to active character', () => {
    const bodyOrientation = _loadSamBodyOrientation(['0:00:00 sits'], 0);

    expect(bodyOrientation).toBe('sitting');
  });
});
