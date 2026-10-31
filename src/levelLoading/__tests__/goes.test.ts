import { describe, expect, it } from 'vitest';

import { createCharacterKeyframeAtTime } from '@/game/timeline';
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
    const startPosition = createCharacterKeyframeAtTime(level!.timeline.keyframes, samI, 0).position;
    const endPosition = createCharacterKeyframeAtTime(level!.timeline.keyframes, samI, level!.timeline.endTime).position;
    expect(findRoomAtPosition(level!.rooms, startPosition.x, startPosition.y)?.id).toBe('hall');
    expect(findRoomAtPosition(level!.rooms, endPosition.x, endPosition.y)?.id).toBe('closet');
    expect(level!.timeline.endTime).toBeGreaterThan(0);
    expect(createCharacterKeyframeAtTime(level!.timeline.keyframes, samI, 0).effects)
      .toEqual([expect.objectContaining({ kind:'walk', startTime:0, endTime:level!.timeline.endTime })]);
    expect(createCharacterKeyframeAtTime(level!.timeline.keyframes, samI, level!.timeline.endTime - 1).effects)
      .toEqual([expect.objectContaining({ kind:'walk', startTime:0, endTime:level!.timeline.endTime })]);
    expect(createCharacterKeyframeAtTime(level!.timeline.keyframes, samI, level!.timeline.endTime).effects).toEqual([]);
    expect(level!.timeline).not.toHaveProperty('pendingWalkingIntervals');
  });

  it('accepts room movement without the optional to', () => {
    const { level, errors } = _loadGoes(['0:00:00 Sam goes Closet'], 'goes-without-to.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const endPosition = createCharacterKeyframeAtTime(level!.timeline.keyframes,
      level!.timeline.characterIdToI.sam, level!.timeline.endTime).position;
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
    const atStart = createCharacterKeyframeAtTime(level!.timeline.keyframes, samI, 1_000).position;
    const atEnd = createCharacterKeyframeAtTime(level!.timeline.keyframes, samI, level!.timeline.endTime).position;
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
    const endPosition = createCharacterKeyframeAtTime(level!.timeline.keyframes,
      level!.timeline.characterIdToI.sam, level!.timeline.endTime).position;
    expect(findRoomAtPosition(level!.rooms, endPosition.x, endPosition.y)?.id).toBe('closet');
  });

  it('uses an authored room horizontal target', () => {
    const { level, errors } = _loadGoes(['0:00:00 Sam goes Closet (80%)'], 'goes-room-horizontal-target.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const closet = level!.rooms.find(room => room.id === 'closet')!;
    const endPosition = createCharacterKeyframeAtTime(level!.timeline.keyframes,
      level!.timeline.characterIdToI.sam, level!.timeline.endTime).position;
    expect(endPosition.x).toBeGreaterThan(closet.rect.x + closet.rect.width / 2);
  });

  it('uses a horizontal target in the current room without to', () => {
    const { level, errors } = _loadGoes(['0:00:00 Sam goes (90%)'], 'goes-current-room-horizontal-target.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const samI = level!.timeline.characterIdToI.sam;
    const startPosition = createCharacterKeyframeAtTime(level!.timeline.keyframes, samI, 0).position;
    const endPosition = createCharacterKeyframeAtTime(level!.timeline.keyframes, samI, level!.timeline.endTime).position;
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
    const beforeStart = createCharacterKeyframeAtTime(level!.timeline.keyframes, samI, 4_999).position;
    const atStart = createCharacterKeyframeAtTime(level!.timeline.keyframes, samI, 5_000).position;
    expect(findRoomAtPosition(level!.rooms, beforeStart.x, beforeStart.y)?.id).toBe('hall');
    expect(atStart).toEqual(beforeStart);
    expect(createCharacterKeyframeAtTime(level!.timeline.keyframes, samI, 4_999).effects).toEqual([]);
    expect(createCharacterKeyframeAtTime(level!.timeline.keyframes, samI, 5_000).effects)
      .toEqual([expect.objectContaining({ kind:'walk', startTime:5_000, endTime:level!.timeline.endTime })]);
  });

  it('resolves a following relative activity from completed movement', () => {
    const { level, errors } = _loadGoes([
      '0:00:00 Sam goes Closet',
      ': Sam sits'
    ], 'goes-relative-successor.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const snapshot = createCharacterKeyframeAtTime(level!.timeline.keyframes,
      level!.timeline.characterIdToI.sam, level!.timeline.endTime);
    expect(snapshot.bodyOrientation).toBe('sitting');
  });

  it('sequences from an already-satisfied room-only destination without delay', () => {
    const { level, errors } = _loadGoes([
      '0:00:00 Sam goes Hall',
      ': Sam waits 1'
    ], 'goes-already-satisfied.md');

    expect(errors.describeErrors()).toBe('');
    expect(level?.timeline.endTime).toBe(1_000);
    expect(createCharacterKeyframeAtTime(level!.timeline.keyframes, level!.timeline.characterIdToI.sam, 0).effects).toEqual([]);
    expect(createCharacterKeyframeAtTime(level!.timeline.keyframes, level!.timeline.characterIdToI.sam, 1_000).effects).toEqual([]);
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
      level!.timeline.characterIdToI.sam, level!.timeline.endTime);
    expect(snapshot.facingDirection).toBe('left');
    expect(snapshot.bodyOrientation).toBe('standing');
    const samI = level!.timeline.characterIdToI.sam;
    expect(createCharacterKeyframeAtTime(level!.timeline.keyframes, samI, 0).effects)
      .toEqual([expect.objectContaining({ kind:'walk', startTime:0, endTime:level!.timeline.endTime })]);
    expect(createCharacterKeyframeAtTime(level!.timeline.keyframes, samI, level!.timeline.endTime - 1).effects)
      .toEqual([expect.objectContaining({ kind:'walk', startTime:0, endTime:level!.timeline.endTime })]);
    expect(snapshot.effects).toEqual([]);
  });

  it('ends a walk during a real wait and starts a fresh walk afterward', () => {
    const { level, errors } = _loadGoes([
      '0:00:00 Sam goes Closet',
      ': Sam waits 1',
      ': Sam goes Hall'
    ], 'goes-wait-splits-walk.md');

    expect(errors.describeErrors()).toBe('');
    const samI = level!.timeline.characterIdToI.sam;
    const first = createCharacterKeyframeAtTime(level!.timeline.keyframes, samI, 0).effects
      .find(effect => effect.kind === 'walk')!;
    expect(first).toBeDefined();
    expect(createCharacterKeyframeAtTime(level!.timeline.keyframes, samI, first.endTime).effects).toEqual([]);
    expect(createCharacterKeyframeAtTime(level!.timeline.keyframes, samI, first.endTime + 999).effects).toEqual([]);
    expect(createCharacterKeyframeAtTime(level!.timeline.keyframes, samI, first.endTime + 1_000).effects)
      .toEqual([expect.objectContaining({ kind:'walk', startTime:first.endTime + 1_000, endTime:level!.timeline.endTime })]);
    expect(createCharacterKeyframeAtTime(level!.timeline.keyframes, samI, level!.timeline.endTime).effects).toEqual([]);
  });

  it('uses a completed goes timeline when another character faces the mover', () => {
    const { level, errors } = loadLevelForTest(facesFutureMovementText, 'faces-during-goes.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const benny = createCharacterKeyframeAtTime(level!.timeline.keyframes,
      level!.timeline.characterIdToI.benny, 19_000);
    expect(benny.facingDirection).toBe('right');
  });

});
