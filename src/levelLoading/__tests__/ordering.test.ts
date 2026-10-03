import { describe, expect, it } from 'vitest';

import { createKeyframeAtTime } from '@/game/timeline';

import defaultLevelText from './fixtures/ordering-base.md?raw';
import { loadLevelForTest, replaceSection } from './testLevelUtil';

describe('level loading - activity ordering', () => {
  it('schedules newly resolved relative activities around earlier absolute activities', () => {
    const text = replaceSection(defaultLevelText, 'itinerary', [
      '0:00:00 Sam sits',
      ': Benny waits 3',
      ': Sam stands',
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

  it('schedules a newly resolved relative activity before a preceding later activity', () => {
    const text = replaceSection(defaultLevelText, 'itinerary', [
      '0:00:00 Sam waits 20',
      ': Sam sits',
      '0:00:12 Benny waits 1',
      ': Benny lays'
    ]);

    const { level, errors } = loadLevelForTest(text, 'ordering-resolved-before-preceding.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
  });

  it('schedules an earlier movement block authored after a later activity', () => {
    const text = replaceSection(defaultLevelText, 'itinerary', [
      '0:00:10 Sam drops Key',
      '0:00:00 Sam goes Closet',
      ': Sam @ Closet',
      ': Sam takes Key'
    ]);
    /* Even though the movement block is authored after the drop, its earlier start and relative chain must be
    scheduled first. Otherwise Sam attempts to drop Key before acquiring it, reproducing the ordering shape that
    previously affected Sticky Agatha's movement block. */
    const { level, errors } = loadLevelForTest(text, 'ordering-earlier-arrival-block.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const end = createKeyframeAtTime(level!.timeline.keyframes, level!.endTime);
    expect(end.rooms[level!.timeline.roomIdToI.closet].items.map(item => item.id)).toContain('key');
  });

});
