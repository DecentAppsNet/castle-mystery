import { describe, it, expect } from 'vitest';

import { findRoomAtPosition } from '@/game/roomUtil';
import Level from '@/game/types/Level';
import { createCharacterKeyframeAtTime, createKeyframeAtTime, findCharacterPositionAtTime } from '@/game/timeline';
import takesAfterRoomMutationText from './fixtures/takes/takes-after-room-mutation.md?raw';
import takesConcurrentlyText from './fixtures/takes/takes-concurrently.md?raw';
import takesDuringReservationText from './fixtures/takes/takes-during-reservation.md?raw';
import takesSourceConflictText from './fixtures/takes/takes-source-conflict.md?raw';
import defaultLevelText from './fixtures/takes/takes-base.md?raw';
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

function _findTakeEffect(level:Level) {
  const samI = level.timeline.characterIdToI.sam;
  const effect = level.timeline.keyframes.flatMap(keyframe => keyframe.characters[samI].effects)
    .find(candidate => candidate.kind === 'takeItem');
  expect(effect).toBeDefined();
  return effect!;
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

  it('preserves an earlier-scheduled room mutation that completes during the walk to take an item', () => {
    const { level, errors } = loadLevelForTest(takesAfterRoomMutationText, 'takes-after-room-mutation.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const effect = _findTakeEffect(level!);
    const beforeTake = createKeyframeAtTime(level!.timeline.keyframes, effect.startTime - 1);
    const takeStart = createKeyframeAtTime(level!.timeline.keyframes, effect.startTime);
    expect(beforeTake.rooms[level!.timeline.roomIdToI.hall].items.map(item => item.id))
      .toEqual(['key', 'table', 'coin']);
    expect(takeStart.rooms[level!.timeline.roomIdToI.hall].items.map(item => item.id))
      .toEqual(['table', 'coin']);

    const snapshot = createKeyframeAtTime(level!.timeline.keyframes, AFTER_ACTIVITY_TIME);
    const hall = snapshot.rooms[level!.timeline.roomIdToI.hall];
    const sam = snapshot.characters[level!.timeline.characterIdToI.sam];

    expect(hall.items.map(item => item.id)).toEqual(['table', 'coin']);
    expect(sam.items.map(item => item.id)).toContain('key');
  });

  it('rejects another item operation overlapping the same character\'s take activity', () => {
    const { level, errors } = loadLevelForTest(takesDuringReservationText, 'takes-during-reservation.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('sam can\'t drop because they are busy with "takes" activity');
  });

  it('rejects an item emitting while another character takes it', () => {
    const text = takesDuringReservationText
      .replace('k..S', 'k.JS')
      .replace('* S=Sam', '* S=Sam\n* J=Jo')
      .replace('## Sam\n* items=Pencil', '## Sam\n* items=Pencil\n\n## Jo')
      .replace('0:00:01 Sam drops Pencil', [
        '0:00:00 Jo faces Sam',
        '0:00:00 Key emits "A bell rings for several seconds."'
      ].join('\n'));
    const { level, errors } = loadLevelForTest(text, 'takes-item-reservation.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Can\'t emit because "key" item is busy with "takes" activity');
  });

  it('allows another item operation by the same character at the exact take effect end', () => {
    const text = replaceSection(defaultLevelText, 'itinerary', [
      '0:00:00 Sam takes Key',
      ': drops Key'
    ]);
    const { level, errors } = loadLevelForTest(text, 'takes-at-effect-end.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const takeEffect = _findTakeEffect(level!);
    const dropEffect = level!.timeline.keyframes
      .flatMap(keyframe => keyframe.characters[level!.timeline.characterIdToI.sam].effects)
      .find(candidate => candidate.kind === 'dropItem');

    expect(dropEffect?.startTime).toBe(takeEffect.endTime);
  });

  it('allows different characters to take different room items concurrently', () => {
    const { level, errors } = loadLevelForTest(takesConcurrentlyText, 'takes-concurrently.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const snapshot = createKeyframeAtTime(level!.timeline.keyframes, AFTER_ACTIVITY_TIME);
    const sam = snapshot.characters[level!.timeline.characterIdToI.sam];
    const jo = snapshot.characters[level!.timeline.characterIdToI.jo];

    expect(sam.items.map(item => item.id)).toContain('key');
    expect(jo.items.map(item => item.id)).toContain('vase');
    expect(snapshot.rooms[level!.timeline.roomIdToI.hall].items).toEqual([]);
  });

  it('rejects a take when an earlier-scheduled take removes the source item during the walk', () => {
    const { level, errors } = loadLevelForTest(takesSourceConflictText, 'takes-source-conflict.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('"key" item is no longer in "hall" room, so can\'t be taken.');
  });

  it('errors when character attempts to take an item that is not in the level', () => {
    const text = replaceSection(defaultLevelText, 'itinerary', ['0:00:00 Sam takes Spoon']);
    const { level, errors } = loadLevelForTest(text, 'takes-undefined-item.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Spoon');
  });

  it('errors when character attempts to take an item from a different room', () => {
    const activityText = '0:00:01 Sam takes Vase';
    const text = replaceSection(defaultLevelText, 'itinerary', [
      '0:00:00 Sam waits',
      '',
      activityText
    ]);
    const activityLineNo = text.split('\n').findIndex(line => line === activityText) + 1;
    const { level, errors } = loadLevelForTest(text, 'takes-different-room.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toBe(
      `takes-different-room.md:${activityLineNo}:0: "vase" item is not in "hall" room with "sam" character, so can't be taken.`
    );
  });

  it('character takes an item from room into left hand', () => {
    const { level, errors } = _loadTakesActivity('0:00:00 Sam takes Key into left hand');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const effect = _findTakeEffect(level!);
    const samI = level!.timeline.characterIdToI.sam;
    const hallI = level!.timeline.roomIdToI.hall;
    const before = createKeyframeAtTime(level!.timeline.keyframes, effect.startTime - 1);
    const start = createKeyframeAtTime(level!.timeline.keyframes, effect.startTime);
    const beforeEnd = createKeyframeAtTime(level!.timeline.keyframes, effect.endTime - 1);
    const end = createKeyframeAtTime(level!.timeline.keyframes, effect.endTime);

    expect(before.rooms[hallI].items.map(item => item.id)).toContain('key');
    expect(before.characters[samI].leftHandItem?.id).toBe('eraser');
    expect(start.rooms[hallI].items.map(item => item.id)).not.toContain('key');
    expect(start.characters[samI].leftHandItem?.id).toBe('key');
    expect(start.characters[samI].effects).toContain(effect);
    expect(start.characters[samI].items.map(item => item.id)).toContain('eraser');
    expect(beforeEnd.characters[samI].leftHandItem?.id).toBe('key');
    expect(beforeEnd.characters[samI].effects).toContain(effect);
    expect(end.characters[samI].leftHandItem?.id).toBe('key');
    expect(end.characters[samI].effects).not.toContain(effect);
  });

  it('character takes an item from room into right hand', () => {
    const { level, errors } = _loadTakesActivity('0:00:00 Sam takes Key into right hand');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const effect = _findTakeEffect(level!);
    const samI = level!.timeline.characterIdToI.sam;
    const hallI = level!.timeline.roomIdToI.hall;
    const before = createKeyframeAtTime(level!.timeline.keyframes, effect.startTime - 1);
    const start = createKeyframeAtTime(level!.timeline.keyframes, effect.startTime);
    const beforeEnd = createKeyframeAtTime(level!.timeline.keyframes, effect.endTime - 1);
    const end = createKeyframeAtTime(level!.timeline.keyframes, effect.endTime);

    expect(before.rooms[hallI].items.map(item => item.id)).toContain('key');
    expect(before.characters[samI].rightHandItem?.id).toBe('paper');
    expect(start.rooms[hallI].items.map(item => item.id)).not.toContain('key');
    expect(start.characters[samI].rightHandItem?.id).toBe('key');
    expect(start.characters[samI].effects).toContain(effect);
    expect(start.characters[samI].items.map(item => item.id)).toContain('paper');
    expect(beforeEnd.characters[samI].rightHandItem?.id).toBe('key');
    expect(beforeEnd.characters[samI].effects).toContain(effect);
    expect(end.characters[samI].rightHandItem?.id).toBe('key');
    expect(end.characters[samI].effects).not.toContain(effect);
  });

  it('character takes an item from room into inventory', () => {
    const { level, errors } = _loadTakesActivity('0:00:00 Sam takes Key into inventory');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const effect = _findTakeEffect(level!);
    const samI = level!.timeline.characterIdToI.sam;
    const hallI = level!.timeline.roomIdToI.hall;
    const before = createKeyframeAtTime(level!.timeline.keyframes, effect.startTime - 1);
    const start = createKeyframeAtTime(level!.timeline.keyframes, effect.startTime);
    const beforeEnd = createKeyframeAtTime(level!.timeline.keyframes, effect.endTime - 1);
    const end = createKeyframeAtTime(level!.timeline.keyframes, effect.endTime);

    expect(before.rooms[hallI].items.map(item => item.id)).toContain('key');
    expect(before.characters[samI].items.map(item => item.id)).not.toContain('key');
    expect(start.rooms[hallI].items.map(item => item.id)).not.toContain('key');
    expect(start.characters[samI].items.map(item => item.id)).toContain('key');
    expect(start.characters[samI].effects).toContain(effect);
    expect(beforeEnd.characters[samI].items.map(item => item.id)).toContain('key');
    expect(beforeEnd.characters[samI].effects).toContain(effect);
    expect(end.characters[samI].items.map(item => item.id)).toContain('key');
    expect(end.characters[samI].effects).not.toContain(effect);
  });

  it('character takes an item from inventory into left hand', () => {
    const { level, errors } = _loadTakesActivity('0:00:00 Sam takes Pencil into left hand');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const sam = _findSamAfterActivity(level!);
    expect(sam.items.map(item => item.id)).toEqual(['eraser']);
    expect(sam.leftHandItem?.id ?? null).toBe('pencil');
    expect(sam.rightHandItem?.id ?? null).toBe('paper');
    expect(level!.timeline.keyframes.flatMap(keyframe => keyframe.characters[level!.timeline.characterIdToI.sam].effects)
      .some(effect => effect.kind === 'takeItem')).toBe(false);
    expect(createCharacterKeyframeAtTime(level!.timeline.keyframes, level!.timeline.characterIdToI.sam, 0)
      .leftHandItem?.id).toBe('pencil');
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