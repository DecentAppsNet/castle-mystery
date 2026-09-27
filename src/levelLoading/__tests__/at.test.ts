import { describe, expect, it } from 'vitest';

import { createCharacterKeyframeAtTime, findCharacterPositionAtTime } from '@/game/timeline';
import { findRoomAtPosition } from '@/game/roomUtil';

import defaultLevelText from './fixtures/at/at-base.md?raw';
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

  it('rejects a room plus percentage destination', () => {
    const { level, errors } = _loadAt(['0:00:00 Sam @ Hall (80%)'], 'at-room-percentage.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Expected format for "@": Timestamp [CharacterId] `@` RoomId');
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