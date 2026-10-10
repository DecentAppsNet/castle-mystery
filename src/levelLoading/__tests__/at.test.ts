import { describe, expect, it } from 'vitest';

import { createCharacterKeyframeAtTime, findCharacterPositionAtTime } from '@/game/timeline';
import { findRoomAtPosition } from '@/game/roomUtil';

import defaultLevelText from './fixtures/at/at-base.md?raw';
import guidanceLevelText from './fixtures/at/at-guidance-base.md?raw';
import { loadLevelForTest, replaceSection } from './testLevelUtil';

function _loadAt(itineraryLines:readonly string[], filename:string) {
  return loadLevelForTest(replaceSection(defaultLevelText, 'itinerary', itineraryLines), filename);
}

describe('level loading - @ activities', () => {
  it('validates an absolute assertion against initial placement', () => {
    const { level, errors } = _loadAt(['0:00:05 Sam @ Hall'], 'at-absolute.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.startTime).toBe(5_000);
    expect(level?.endTime).toBe(5_000);
  });

  it('validates a relative assertion after goes completes', () => {
    const { level, errors } = _loadAt([
      '0:00:00 Sam goes Closet',
      ': Sam @ Closet'
    ], 'at-relative.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const position = findCharacterPositionAtTime(level!.timeline.keyframes,
      level!.timeline.characterIdToI.sam, level!.endTime);
    expect(findRoomAtPosition(level!.rooms, position.x, position.y)?.id).toBe('closet');
  });

  it('uses the active character when the subject is implied', () => {
    const { level, errors } = _loadAt(['0:00:00 @ Hall'], 'at-implied-subject.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
  });

  it('does not move the asserted character', () => {
    const { level, errors } = _loadAt([
      '0:00:00 Sam @ Hall',
      '0:00:05 Sam @ Hall'
    ], 'at-does-not-move.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const samI = level!.timeline.characterIdToI.sam;
    expect(findCharacterPositionAtTime(level!.timeline.keyframes, samI, 5_000))
      .toEqual(findCharacterPositionAtTime(level!.timeline.keyframes, samI, 0));
  });

  it('does not reserve the character during another activity', () => {
    const { level, errors } = _loadAt([
      '0:00:00 Sam waits 3',
      '0:00:01 Sam @ Hall'
    ], 'at-does-not-reserve-character.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
  });

  it('validates against the completed timeline when authored before same-time goes', () => {
    const { level, errors } = _loadAt([
      '0:00:00 Sam @ Hall',
      '0:00:00 Sam goes Closet'
    ], 'at-before-same-time-goes.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
  });

  it('reports a wrong-room assertion at its exact source line', () => {
    const activityText = '0:00:05 Sam @ Closet';
    const text = replaceSection(defaultLevelText, 'itinerary', ['0:00:00 Sam stands', '', activityText]);
    const activityLineNo = text.split('\n').findIndex(line => line === activityText) + 1;
    const { level, errors } = loadLevelForTest(text, 'at-wrong-room.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain(
      `at-wrong-room.md:${activityLineNo}:0: sam was not at closet at 0:00:05. Actual room: hall.`
    );
  });

  it('suggests a movement start from a trustworthy preceding assertion', () => {
    const text = replaceSection(guidanceLevelText, 'itinerary', [
      '0:00:00 Sam @ Hall',
      '0:00:10 Sam @ Library'
    ]);
    const { level, errors } = loadLevelForTest(text, 'at-guidance-from-at.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain(
      'sam would need to start movement from hall at 0:00:07 to arrive in time.'
    );
  });

  it('derives guidance origin from the timeline at a preceding goes start', () => {
    const text = replaceSection(guidanceLevelText, 'itinerary', [
      '0:00:01 Sam goes Closet',
      '0:00:10 Sam @ Library'
    ]);
    const { level, errors } = loadLevelForTest(text, 'at-guidance-from-goes.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain(
      'sam would need to start movement from hall at 0:00:07 to arrive in time.'
    );
  });

  it('uses the latest preceding goes or @ activity for the same character', () => {
    const text = replaceSection(guidanceLevelText, 'itinerary', [
      '0:00:00 Sam @ Hall',
      '0:00:01 Sam goes Closet',
      ': Sam @ Closet',
      '0:00:10 Sam @ Library'
    ]);
    const { level, errors } = loadLevelForTest(text, 'at-guidance-latest-origin-activity.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('sam would need to start movement from closet at');
  });

  it('ignores other characters and later-source equal-time activities', () => {
    const text = replaceSection(guidanceLevelText, 'itinerary', [
      '0:00:00 Sam goes Closet',
      ': Sam @ Closet',
      '0:00:10 Benny @ Closet',
      '0:00:10 Sam @ Library',
      '0:00:10 Sam @ Hall'
    ]);
    const { level, errors } = loadLevelForTest(text, 'at-guidance-origin-activity-eligibility.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('sam would need to start movement from closet at');
  });

  it('uses initial placement when no preceding goes or trustworthy @ activity exists', () => {
    const { level, errors } = loadLevelForTest(replaceSection(guidanceLevelText, 'itinerary', [
      '0:00:10 Sam @ Library'
    ]), 'at-guidance-from-initial-placement.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain(
      'sam was not at library at 0:00:10. Actual room: hall. '
      + 'sam would need to start movement from hall at 0:00:07 to arrive in time.'
    );
  });

  it('validates a room and horizontal target after matching movement', () => {
    const { level, errors } = _loadAt([
      '0:00:00 Sam goes Hall (80%)',
      ': Sam @ Hall (80%)'
    ], 'at-horizontal-target.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
  });

  it('validates the horizontal target selected when movement started after occupancy changes', () => {
    const { level, errors } = _loadAt([
      '0:00:00 Benny goes Hall (80%)',
      ': Benny @ Hall (80%)',
      ': Sam goes Hall (80%)',
      ': Benny goes Closet',
      ': Sam @ Hall (80%)'
    ], 'at-horizontal-target-origin-occupancy.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
  });

  it('allows any in-room position when no horizontal target is specified', () => {
    const { level, errors } = _loadAt([
      '0:00:00 Sam goes Hall (20%)',
      ': Sam @ Hall'
    ], 'at-room-only-after-horizontal-movement.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
  });

  it('reports a horizontal target mismatch without moving the character', () => {
    const { level, errors } = _loadAt([
      '0:00:00 Sam goes Hall (20%)',
      ': Sam @ Hall (80%)'
    ], 'at-wrong-horizontal-target.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('sam was not at the 80% target in hall at');
  });

  it('uses the asserted horizontal target for correction guidance', () => {
    const { errors } = loadLevelForTest(replaceSection(guidanceLevelText, 'itinerary', [
      '0:00:10 Sam @ Library (100%)'
    ]), 'at-horizontal-target-guidance.md');

    expect(errors.describeErrors()).toContain(
      'sam would need to start movement from hall at 0:00:07 to arrive in time.'
    );
  });

  it('does not recommend movement from a preceding @ with an invalid horizontal target', () => {
    const { errors } = loadLevelForTest(replaceSection(guidanceLevelText, 'itinerary', [
      '0:00:00 Sam @ Hall (0%)',
      '0:00:10 Sam @ Library'
    ]), 'at-invalid-horizontal-origin.md');

    expect(errors.describeErrors()).toContain(
      'The previous @ activity at 0:00:00 is invalid, so no recommended correction has been made.'
    );
  });

  it('calculates guidance for two failures without changing the completed timeline', () => {
    const text = replaceSection(guidanceLevelText, 'itinerary', [
      '0:00:00 Sam @ Hall',
      '0:00:10 Sam @ Closet',
      '0:00:20 Sam @ Library'
    ]);
    const { level, errors } = loadLevelForTest(text, 'at-guidance-does-not-move.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain(
      'sam was not at closet at 0:00:10. Actual room: hall. '
      + 'sam would need to start movement from hall at'
    );
    expect(errors.describeErrors()).toContain(
      'sam was not at library at 0:00:20. Actual room: hall. '
      + 'The previous @ activity at 0:00:10 is invalid, so no recommended correction has been made.'
    );
  });

  it('requires a room', () => {
    const { level, errors } = _loadAt(['0:00:00 Sam @'], 'at-missing-room.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Expected format for "@": Timestamp [CharacterId] `@` RoomId');
  });

  it('rejects a percentage-only destination', () => {
    const { level, errors } = _loadAt(['0:00:00 Sam @ (80%)'], 'at-percentage-only.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Expected format for "@": Timestamp [CharacterId] `@` RoomId');
  });

  it('accepts a room plus percentage destination', () => {
    const { level, errors } = _loadAt(['0:00:00 Sam @ Hall (80%)'], 'at-room-percentage.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('sam was not at the 80% target in hall at 0:00:00.');
  });

  it('starts a relative successor at the assertion time', () => {
    const { level, errors } = _loadAt([
      '0:00:00 Sam @ Hall',
      ': Sam sits'
    ], 'at-relative-successor.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const snapshot = createCharacterKeyframeAtTime(level!.timeline.keyframes,
      level!.timeline.characterIdToI.sam, 0);
    expect(snapshot.bodyOrientation).toBe('sitting');
    expect(level!.endTime).toBe(0);
  });

  it('extends the level end time as a zero-duration activity', () => {
    const { level, errors } = _loadAt([
      '0:00:00 Sam stands',
      '0:00:05 Sam @ Hall'
    ], 'at-level-end.md');

    expect(errors.describeErrors()).toBe('');
    expect(level?.endTime).toBe(5_000);
    expect(level?.timeline.startTime).toBe(0);
    expect(level?.timeline.endTime).toBe(5_000);
    expect(level?.timeline.endTime).toBe(level?.endTime);
    expect(level!.timeline.keyframes.every(keyframe => keyframe.time < level!.timeline.endTime)).toBe(true);
  });

  it('validates an assertion before later movement away', () => {
    const { level, errors } = _loadAt([
      '0:00:00 Sam stands',
      '0:00:05 Sam @ Hall',
      '0:00:06 Sam goes Closet'
    ], 'at-before-later-movement.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const position = findCharacterPositionAtTime(level!.timeline.keyframes,
      level!.timeline.characterIdToI.sam, level!.endTime);
    expect(findRoomAtPosition(level!.rooms, position.x, position.y)?.id).toBe('closet');
  });
});