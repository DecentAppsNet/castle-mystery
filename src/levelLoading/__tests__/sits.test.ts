import { describe, expect, it } from 'vitest';

import { createCharacterKeyframeAtTime, createKeyframeAtTime } from '@/game/timeline';

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

  it('walks to a hidden target and sits only at arrival without changing the item', () => {
    const text = replaceSection(defaultLevelText, 'itinerary', ['0:00:00 Sam sits in Marker']);
    const { level, errors } = loadLevelForTest(text, 'sits-target.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const samI = level!.timeline.characterIdToI.sam;
    const hallI = level!.timeline.roomIdToI.hall;
    const start = createKeyframeAtTime(level!.timeline.keyframes, 0);
    const beforeEnd = createKeyframeAtTime(level!.timeline.keyframes, level!.endTime - 1);
    const end = createKeyframeAtTime(level!.timeline.keyframes, level!.endTime);
    const marker = start.rooms[hallI].items.find(item => item.id === 'marker');

    expect(marker?.isVisible).toBe(false);
    expect(start.characters[samI].bodyOrientation).toBe('standing');
    expect(beforeEnd.characters[samI].bodyOrientation).toBe('standing');
    expect(end.characters[samI]).toMatchObject({ position:marker?.position, bodyOrientation:'sitting' });
    expect(end.rooms[hallI].items.find(item => item.id === 'marker')).toEqual(marker);
  });

  it('starts a relative successor after targeted travel', () => {
    const text = replaceSection(defaultLevelText, 'itinerary', [
      '0:00:00 Sam sits in Marker',
      ': Sam waits 1'
    ]);
    const { level, errors } = loadLevelForTest(text, 'sits-relative-target.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const movementEndTime = level!.timeline.keyframes.findLast(keyframe =>
      keyframe.characters[level!.timeline.characterIdToI.sam].position.x !== undefined)?.time;
    expect(level!.endTime).toBe(movementEndTime! + 1_000);
  });
});
