import { describe, expect, it } from 'vitest';

import { createCharacterKeyframeAtTime, findCharacterPositionAtTime } from '@/game/timeline';
import { findRoomAtPosition } from '@/game/roomUtil';

import goesBaseText from './fixtures/goes/goes-base.md?raw';
import facesFutureMovementText from './fixtures/faces/faces-during-future-arrival.md?raw';
import { loadLevelForTest, replaceSection } from './testLevelUtil';

function _loadGoes(itineraryLines:readonly string[], filename:string) {
  return loadLevelForTest(replaceSection(goesBaseText, 'itinerary', itineraryLines), filename);
}

describe('level loading - goes activities', () => {
  it('starts absolute movement at its authored timestamp', () => {
    const { level, errors } = _loadGoes(['0:00:00 Sam goes to Closet'], 'goes-absolute.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const samI = level!.timeline.characterIdToI.sam;
    const startPosition = findCharacterPositionAtTime(level!.timeline.keyframes, samI, 0);
    const endPosition = findCharacterPositionAtTime(level!.timeline.keyframes, samI, level!.endTime);
    expect(findRoomAtPosition(level!.rooms, startPosition.x, startPosition.y)?.id).toBe('hall');
    expect(findRoomAtPosition(level!.rooms, endPosition.x, endPosition.y)?.id).toBe('closet');
    expect(level!.endTime).toBeGreaterThan(0);
  });

  it('accepts room movement without the optional to', () => {
    const { level, errors } = _loadGoes(['0:00:00 Sam goes Closet'], 'goes-without-to.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const endPosition = findCharacterPositionAtTime(level!.timeline.keyframes,
      level!.timeline.characterIdToI.sam, level!.endTime);
    expect(findRoomAtPosition(level!.rooms, endPosition.x, endPosition.y)?.id).toBe('closet');
  });

  it('accepts relative room movement with the optional to', () => {
    const { level, errors } = _loadGoes([
      '0:00:00 Sam waits 1',
      ': Sam goes to Closet'
    ], 'goes-relative-to.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const samI = level!.timeline.characterIdToI.sam;
    const atStart = findCharacterPositionAtTime(level!.timeline.keyframes, samI, 1_000);
    const atEnd = findCharacterPositionAtTime(level!.timeline.keyframes, samI, level!.endTime);
    expect(findRoomAtPosition(level!.rooms, atStart.x, atStart.y)?.id).toBe('hall');
    expect(findRoomAtPosition(level!.rooms, atEnd.x, atEnd.y)?.id).toBe('closet');
  });

  it('accepts relative room movement without the optional to', () => {
    const { level, errors } = _loadGoes([
      '0:00:00 Sam waits 1',
      ': Sam goes Closet'
    ], 'goes-relative-without-to.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
  });

  it('uses the active character when the subject is implied', () => {
    const { level, errors } = _loadGoes(['0:00:00 goes Closet'], 'goes-implied-subject.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const endPosition = findCharacterPositionAtTime(level!.timeline.keyframes,
      level!.timeline.characterIdToI.sam, level!.endTime);
    expect(findRoomAtPosition(level!.rooms, endPosition.x, endPosition.y)?.id).toBe('closet');
  });

  it('uses an authored room horizontal target', () => {
    const { level, errors } = _loadGoes(['0:00:00 Sam goes Closet (80%)'], 'goes-room-horizontal-target.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const closet = level!.rooms.find(room => room.id === 'closet')!;
    const endPosition = findCharacterPositionAtTime(level!.timeline.keyframes,
      level!.timeline.characterIdToI.sam, level!.endTime);
    expect(endPosition.x).toBeGreaterThan(closet.rect.x + closet.rect.width / 2);
  });

  it('uses a horizontal target in the current room without to', () => {
    const { level, errors } = _loadGoes(['0:00:00 Sam goes (90%)'], 'goes-current-room-horizontal-target.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const samI = level!.timeline.characterIdToI.sam;
    const startPosition = findCharacterPositionAtTime(level!.timeline.keyframes, samI, 0);
    const endPosition = findCharacterPositionAtTime(level!.timeline.keyframes, samI, level!.endTime);
    expect(endPosition.x).toBeGreaterThan(startPosition.x);
  });

  it('uses a horizontal target in the current room with to', () => {
    const { level, errors } = _loadGoes(['0:00:00 Sam goes to (90%)'], 'goes-current-room-horizontal-target-to.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
  });

  it('reports a missing destination at its authored source line', () => {
    const activityText = '0:00:00 Sam goes';
    const text = replaceSection(goesBaseText, 'itinerary', ['', activityText]);
    const activityLineNo = text.split('\n').findIndex(line => line === activityText) + 1;
    const { level, errors } = loadLevelForTest(text, 'goes-missing-destination.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain(`goes-missing-destination.md:${activityLineNo}:0: The goes activity needs room ID, horizontal target %, or both specified.`);
  });

  it('does not begin absolute movement before its authored timestamp', () => {
    const { level, errors } = _loadGoes([
      '0:00:00 Sam stands',
      '0:00:05 Sam goes Closet'
    ], 'goes-start-time.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const samI = level!.timeline.characterIdToI.sam;
    const beforeStart = findCharacterPositionAtTime(level!.timeline.keyframes, samI, 4_999);
    const atStart = findCharacterPositionAtTime(level!.timeline.keyframes, samI, 5_000);
    expect(findRoomAtPosition(level!.rooms, beforeStart.x, beforeStart.y)?.id).toBe('hall');
    expect(atStart).toEqual(beforeStart);
  });

  it('resolves a following relative activity from completed movement', () => {
    const { level, errors } = _loadGoes([
      '0:00:00 Sam goes Closet',
      ': Sam sits'
    ], 'goes-relative-successor.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const snapshot = createCharacterKeyframeAtTime(level!.timeline.keyframes,
      level!.timeline.characterIdToI.sam, level!.endTime);
    expect(snapshot.bodyOrientation).toBe('sitting');
  });

  it('sequences from an already-satisfied room-only destination without delay', () => {
    const { level, errors } = _loadGoes([
      '0:00:00 Sam goes Hall',
      ': Sam waits 1'
    ], 'goes-already-satisfied.md');

    expect(errors.describeErrors()).toBe('');
    expect(level?.endTime).toBe(1_000);
  });

  it('uses the central conflict validator for movement', () => {
    const { level, errors } = _loadGoes([
      '0:00:00 Sam waits 3',
      '0:00:01 Sam goes Closet'
    ], 'goes-conflict.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain(`sam can't go because they are busy with "waits" activity`);
  });

  it('preserves travel and standing orientation behavior', () => {
    const { level, errors } = _loadGoes([
      '0:00:00 Sam goes Closet',
      ': Sam goes Hall'
    ], 'goes-orientation.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const snapshot = createCharacterKeyframeAtTime(level!.timeline.keyframes,
      level!.timeline.characterIdToI.sam, level!.endTime);
    expect(snapshot.facingDirection).toBe('left');
    expect(snapshot.bodyOrientation).toBe('standing');
  });

  it('uses a completed goes timeline when another character faces the mover', () => {
    const text = facesFutureMovementText.replace('0:00:20 Sam @ Library', '0:00:00 Sam goes Library');
    const { level, errors } = loadLevelForTest(text, 'faces-during-goes.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const benny = createCharacterKeyframeAtTime(level!.timeline.keyframes,
      level!.timeline.characterIdToI.benny, 19_000);
    expect(benny.facingDirection).toBe('right');
  });

});
