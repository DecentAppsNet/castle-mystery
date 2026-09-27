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

  it('schedules an earlier absolute arrival block authored after a later activity', () => {
    const text = replaceSection(defaultLevelText, 'itinerary', [
      '0:00:00 Sam stands',
      '0:00:10 Sam drops Key',
      '0:00:05 Sam @ Closet',
      ': Sam takes Key'
    ]);
    /* The absolute @ timestamp is an arrival time stored initially as endTime. Even though its block is authored
    after the drop, the arrival and relative take must be scheduled first. Otherwise Sam attempts to drop Key
    before acquiring it, reproducing the ordering shape that previously affected Sticky Agatha's movement block. */
    const { level, errors } = loadLevelForTest(text, 'ordering-earlier-arrival-block.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const end = createKeyframeAtTime(level!.timeline.keyframes, level!.endTime);
    expect(end.rooms[level!.timeline.roomIdToI.closet].items.map(item => item.id)).toContain('key');
  });

  it('moves an end-timestamped block before a newly resolved later relative activity', () => {
    const text = replaceSection(defaultLevelText, 'itinerary', [
      '0:00:00 Sam waits 20',
      ': Sam takes Coin',
      '0:00:10 Benny @ Hall',
      ': Benny drops Coin'
    ]);
    /* Sam's relative take resolves to 20 seconds only after the wait is scheduled. Benny's absolute @ block is
    still known only by its 10-second endTime, so incremental sorting must move that block and its relative drop
    ahead of Sam's take. The resulting ownership proves the complete authored chain ran in dependency order. */
    const { level, errors } = loadLevelForTest(text, 'ordering-relative-around-arrival.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const end = createKeyframeAtTime(level!.timeline.keyframes, level!.endTime);
    expect(end.characters[level!.timeline.characterIdToI.sam].items.map(item => item.id)).toContain('coin');
  });

  it('keeps an earlier activity before future-arriving movement that starts later', () => {
    const text = replaceSection(defaultLevelText, 'itinerary', [
      '0:00:00 Sam stands',
      '0:00:05 Benny faces Sam',
      '0:00:20 Sam @ Closet'
    ]);
    /* An arrival endTime after an ordinary startTime does not prove which activity starts first. Here the short
    movement begins well after Benny faces Sam, so the initial start-time-first guess is correct. This protects
    future recovery logic from always forcing an unresolved future-arriving movement ahead of earlier activities. */
    const { level, errors } = loadLevelForTest(text, 'ordering-correct-arrival-guess.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const bennyI = level!.timeline.characterIdToI.benny;
    expect(createKeyframeAtTime(level!.timeline.keyframes, 5_000).characters[bennyI].facingDirection).toBe('left');
  });

  it('orders absolute arrival blocks by end time while preserving their relative successors', () => {
    const text = replaceSection(defaultLevelText, 'itinerary', [
      '0:00:00 Sam stands',
      '0:00:20 Sam @ Closet',
      ': Sam sits',
      '0:00:10 Sam @ Hall (90%)',
      ': Sam lays'
    ]);
    /* Both @ activities initially have only endTime values, and the later arrival is authored first. Sorting must
    schedule the 10-second Hall arrival with its relative laying activity before the 20-second Closet arrival and
    its relative sitting activity. The two postures make each preserved group observable in the final timeline. */
    const { level, errors } = loadLevelForTest(text, 'ordering-absolute-arrival-blocks.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const samI = level!.timeline.characterIdToI.sam;
    expect(createKeyframeAtTime(level!.timeline.keyframes, 10_000).characters[samI].bodyOrientation).toBe('laying');
    expect(createKeyframeAtTime(level!.timeline.keyframes, 20_000).characters[samI].bodyOrientation).toBe('sitting');
  });
});
