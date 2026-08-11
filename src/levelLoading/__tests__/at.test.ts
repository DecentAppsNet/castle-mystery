import { describe, it, expect } from 'vitest';

import { findRoomAtPosition } from '@/game/roomUtil';

import defaultLevelText from './fixtures/at-base.md?raw';
import { loadLevelForTest, replaceSection } from './testLevelUtil';
import { findCharacterPositionAtTime } from '@/game/timeline';

describe('level loading - @ activities', () => {
  it('loads level with absolute timestamp @ activity', () => {
    const text = replaceSection(defaultLevelText, 'itinerary', ['0:00:00 Sam stands', '0:00:05 Sam @ Closet']);
    const { level, errors } = loadLevelForTest(text, 'at-absolute.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.startTime).toBe(0);
    expect(level?.endTime).toBe(5_000);
    const samPosition = findCharacterPositionAtTime(level!.timeline.keyframes,
      level!.timeline.characterIdToI.sam, 5_000);
    expect(findRoomAtPosition(level!.rooms, samPosition.x, samPosition.y)?.id).toBe('closet');
  });

  it('loads level with relative timestamp @ activity', () => {
    const text = replaceSection(defaultLevelText, 'itinerary', [
      '0:00:00 Sam waits',
      ': Sam @ Closet'
    ]);
    const { level, errors } = loadLevelForTest(text, 'at-relative.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.startTime).toBe(0);
    const samPosition = findCharacterPositionAtTime(level!.timeline.keyframes,
      level!.timeline.characterIdToI.sam, 60_000);
    expect(findRoomAtPosition(level!.rooms, samPosition.x, samPosition.y)?.id).toBe('closet');
  });

  it('@ activity with implied subject will default to active character', () => {
    const text = replaceSection(defaultLevelText, 'itinerary', [
      '0:00:00 sits',
      '0:00:03 @ closet'
    ]);
    const { level, errors } = loadLevelForTest(text, 'at-implied-subject.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const samPosition = findCharacterPositionAtTime(level!.timeline.keyframes,
      level!.timeline.characterIdToI.sam, 3_000);
    expect(findRoomAtPosition(level!.rooms, samPosition.x, samPosition.y)?.id).toBe('closet');
  });

  it('character moves to @-activity-specified room', () => {
    const text = replaceSection(defaultLevelText, 'itinerary', ['0:00:00 Sam lays', '0:00:05 Sam @ Closet']);
    const { level, errors } = loadLevelForTest(text, 'at-character-movement.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const samPosition = findCharacterPositionAtTime(level!.timeline.keyframes,
      level!.timeline.characterIdToI.sam, 5_000);
    expect(findRoomAtPosition(level!.rooms, samPosition.x, samPosition.y)?.id).toBe('closet');
  });

  it('character does nothing when already in the @-specified room', () => {
    const text = replaceSection(defaultLevelText, 'itinerary', ['0:00:00 Sam @ hall']);
    const { level, errors } = loadLevelForTest(text, 'at-already-there.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const samPosition = findCharacterPositionAtTime(level!.timeline.keyframes, level!.timeline.characterIdToI.sam, 0);
    expect(findRoomAtPosition(level!.rooms, samPosition.x, samPosition.y)?.id).toBe('hall');
  });

  it('two characters move to @-activity-specified rooms', () => {
    const text = replaceSection(defaultLevelText, 'itinerary', [
      '0:00:00 Sam stands',
      '0:00:05 Sam @ Closet',
      '0:00:05 Benny @ Hall'
    ]);
    const { level, errors } = loadLevelForTest(text, 'at-two-characters.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const samPosition = findCharacterPositionAtTime(level!.timeline.keyframes,
      level!.timeline.characterIdToI.sam, 5_000);
    const bennyPosition = findCharacterPositionAtTime(level!.timeline.keyframes,
      level!.timeline.characterIdToI.benny, 5_000);
    expect(findRoomAtPosition(level!.rooms, samPosition.x, samPosition.y)?.id).toBe('closet');
    expect(findRoomAtPosition(level!.rooms, bennyPosition.x, bennyPosition.y)?.id).toBe('hall');
  });
});