import { describe, it, expect } from 'vitest';

import { findRoomAtPosition } from '@/game/roomUtil';
import Level from '@/game/types/Level';
import { createCharacterKeyframeAtTime, createKeyframeAtTime, findCharacterPositionAtTime } from '@/game/timeline';
import defaultLevelText from './fixtures/takes-base.md?raw';
import { loadLevelForTest, replaceSection } from './testLevelUtil';

const AFTER_ACTIVITY_TIME = 60_000;

function _loadTakesActivity(activityText:string) {
  const text = replaceSection(defaultLevelText, 'itinerary', [activityText]);
  return loadLevelForTest(text, 'takes.md');
}

function _findSamAfterActivity(level:Level) {
  return createCharacterKeyframeAtTime(level.timeline.keyframes,
    level.timeline.characterIdToI.sam, AFTER_ACTIVITY_TIME);
}

describe('level loading - takes activities', () => {
  it('character takes an item in the same room', () => {
    const { level, errors } = _loadTakesActivity('0:00:00 Sam takes Key');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const samPosition = findCharacterPositionAtTime(level!.timeline.keyframes,
      level!.timeline.characterIdToI.sam, AFTER_ACTIVITY_TIME);
    const snapshot = createKeyframeAtTime(level!.timeline.keyframes, AFTER_ACTIVITY_TIME);
    const hall = snapshot.rooms[level!.timeline.roomIdToI.hall];

    expect(findRoomAtPosition(level!.rooms, samPosition.x, samPosition.y)?.id).toBe('hall');
    expect(hall.items.map(item => item.id)).not.toContain('key');
    expect(snapshot.characters[level!.timeline.characterIdToI.sam].items.map(item => item.id)).toContain('key');
  });

  it('errors when character attempts to take an item that is not in the level', () => {
    const text = replaceSection(defaultLevelText, 'itinerary', ['0:00:00 Sam takes Spoon']);
    const { level, errors } = loadLevelForTest(text, 'takes-undefined-item.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Spoon');
  });

  it('errors when character attempts to take an item from a different room', () => {
    const text = replaceSection(defaultLevelText, 'itinerary', ['0:00:00 Sam takes Vase']);
    const { level, errors } = loadLevelForTest(text, 'takes-different-room.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('"vase" item is not in "hall" room with "sam" character, so can\'t be taken.');
  });

  it('character takes an item from room into left hand', () => {
    const { level, errors } = _loadTakesActivity('0:00:00 Sam takes Key into left hand');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const sam = _findSamAfterActivity(level!);
    expect(sam.items.map(item => item.id)).toEqual(['pencil', 'eraser']);
    expect(sam.leftHandItem?.id ?? null).toBe('key');
    expect(sam.rightHandItem?.id ?? null).toBe('paper');
  });

  it('character takes an item from room into right hand', () => {
    const { level, errors } = _loadTakesActivity('0:00:00 Sam takes Key into right hand');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const sam = _findSamAfterActivity(level!);
    expect(sam.items.map(item => item.id)).toEqual(['pencil', 'paper']);
    expect(sam.leftHandItem?.id ?? null).toBe('eraser');
    expect(sam.rightHandItem?.id ?? null).toBe('key');
  });

  it('character takes an item from room into inventory', () => {
    const { level, errors } = _loadTakesActivity('0:00:00 Sam takes Key into inventory');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const sam = _findSamAfterActivity(level!);
    expect(sam.items.map(item => item.id)).toEqual(['pencil', 'key']);
    expect(sam.leftHandItem?.id ?? null).toBe('eraser');
    expect(sam.rightHandItem?.id ?? null).toBe('paper');
  });

  it('character takes an item from inventory into left hand', () => {
    const { level, errors } = _loadTakesActivity('0:00:00 Sam takes Pencil into left hand');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const sam = _findSamAfterActivity(level!);
    expect(sam.items.map(item => item.id)).toEqual(['eraser']);
    expect(sam.leftHandItem?.id ?? null).toBe('pencil');
    expect(sam.rightHandItem?.id ?? null).toBe('paper');
  });

  it('character takes an item from inventory into right hand', () => {
    const { level, errors } = _loadTakesActivity('0:00:00 Sam takes Pencil into right hand');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const sam = _findSamAfterActivity(level!);
    expect(sam.items.map(item => item.id)).toEqual(['paper']);
    expect(sam.leftHandItem?.id ?? null).toBe('eraser');
    expect(sam.rightHandItem?.id ?? null).toBe('pencil');
  });

  it('character takes an item from left hand into right hand', () => {
    const { level, errors } = _loadTakesActivity('0:00:00 Sam takes Eraser into right hand');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const sam = _findSamAfterActivity(level!);
    expect(sam.items.map(item => item.id)).toEqual(['pencil', 'paper']);
    expect(sam.leftHandItem).toBeNull();
    expect(sam.rightHandItem?.id ?? null).toBe('eraser');
  });

  it('character takes an item from right hand into left hand', () => {
    const { level, errors } = _loadTakesActivity('0:00:00 Sam takes Paper into left hand');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const sam = _findSamAfterActivity(level!);
    expect(sam.items.map(item => item.id)).toEqual(['pencil', 'eraser']);
    expect(sam.leftHandItem?.id ?? null).toBe('paper');
    expect(sam.rightHandItem).toBeNull();
  });

  it('character takes an item from left hand into inventory', () => {
    const { level, errors } = _loadTakesActivity('0:00:00 Sam takes Eraser into inventory');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const sam = _findSamAfterActivity(level!);
    expect(sam.items.map(item => item.id)).toEqual(['pencil', 'eraser']);
    expect(sam.leftHandItem).toBeNull();
    expect(sam.rightHandItem?.id ?? null).toBe('paper');
  });

  it('character takes an item from right hand into inventory', () => {
    const { level, errors } = _loadTakesActivity('0:00:00 Sam takes Paper into inventory');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const sam = _findSamAfterActivity(level!);
    expect(sam.items.map(item => item.id)).toEqual(['pencil', 'paper']);
    expect(sam.leftHandItem?.id ?? null).toBe('eraser');
    expect(sam.rightHandItem).toBeNull();
  });
});