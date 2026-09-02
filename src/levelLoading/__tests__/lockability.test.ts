import { describe, expect, it } from 'vitest';

import { createKeyframeAtTime } from '@/game/timeline';
import Effect from '@/game/effects/types/Effect';
import ExitStatus from '@/game/types/ExitStatus';
import Level from '@/game/types/Level';
import RoomExit from '@/game/types/RoomExit';

import lockabilityBaseText from './fixtures/lockability-base.md?raw';
import { loadLevelForTest, replaceSection } from './testLevelUtil';

const MAIN_EXIT_TEXT = 'Closet (unlocked, lockable with Brass Key)';
const LOCKED_MAIN_EXIT_TEXT = 'Closet (locked, lockable with Brass Key)';

function _loadLockability(itineraryLines:readonly string[], text:string = lockabilityBaseText,
    filename:string = 'lockability.md') {
  return loadLevelForTest(replaceSection(text, 'itinerary', itineraryLines), filename);
}

function _findExit(level:Level, roomId:string, otherRoomId:string, time:number):RoomExit {
  const snapshot = createKeyframeAtTime(level.timeline.keyframes, time);
  const room = snapshot.rooms[level.timeline.roomIdToI[roomId]];
  const exit = room.exits.find(candidate =>
    candidate.room1Id === otherRoomId || candidate.room2Id === otherRoomId);
  expect(exit).toBeDefined();
  return exit!;
}

function _findEffect(level:Level, kind:Effect['kind']):Effect {
  const samI = level.timeline.characterIdToI.sam;
  const effect = level.timeline.keyframes.flatMap(keyframe => keyframe.characters[samI].effects)
    .find(candidate => candidate.kind === kind);
  expect(effect).toBeDefined();
  return effect!;
}

function _expectActionError(errorText:string, action:'lock'|'unlock', detail:string):void {
  expect(errorText).toContain(`Can't ${action}`);
  expect(errorText).toContain(detail);
  expect(errorText).not.toContain("Can't locks");
  expect(errorText).not.toContain("Can't unlocks");
}

function _moveSamToCloset(text:string):string {
  return text
    .replace('....\n.S..\n....\n```\n\n* S=Sam', '....\n....\n....\n```')
    .replace('## Closet\n\n```\n....\n....\n....',
      '## Closet\n\n```\n....\n.S..\n....\n```\n\n* S=Sam');
}

describe('level loading - lockability activities', () => {
  it('loads the base exit as operable from the character side with its required item', () => {
    const { level, errors } = _loadLockability([]);

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const hallExit = _findExit(level!, 'hall', 'closet', 0);
    expect(hallExit).toMatchObject({
      room1Id:'hall',
      room2Id:'closet',
      lockableFromRoom1With:'brass key',
      lockableFromRoom2With:null
    });
    expect(createKeyframeAtTime(level!.timeline.keyframes, 0)
      .characters[level!.timeline.characterIdToI.sam].items.map(item => item.id))
      .toEqual(['brass key']);
  });

  it('locks the shared exit in independent room snapshots while preserving unrelated exits', () => {
    const { level, errors } = _loadLockability(['0:00:00 Sam locks Closet']);

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const hallExit = _findExit(level!, 'hall', 'closet', 0);
    const closetExit = _findExit(level!, 'closet', 'hall', 0);
    expect(hallExit.exitStatus).toBe(ExitStatus.locked);
    expect(closetExit.exitStatus).toBe(ExitStatus.locked);
    expect(hallExit).not.toBe(closetExit);
    expect(_findExit(level!, 'hall', 'storage', 0).exitStatus).toBe(ExitStatus.open);
  });

  it('unlocks a previously locked shared exit in both room snapshots', () => {
    const text = lockabilityBaseText.replace(MAIN_EXIT_TEXT, LOCKED_MAIN_EXIT_TEXT);
    const { level, errors } = _loadLockability(['0:00:00 Sam unlocks Closet'], text);

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(_findExit(level!, 'hall', 'closet', 0).exitStatus).toBe(ExitStatus.unlocked);
    expect(_findExit(level!, 'closet', 'hall', 0).exitStatus).toBe(ExitStatus.unlocked);
    expect(_findExit(level!, 'hall', 'storage', 0).exitStatus).toBe(ExitStatus.open);
  });

  it('schedules a relative unlock at the lock effect end and restores unlocked state', () => {
    const { level, errors } = _loadLockability([
      '0:00:00 Sam locks Closet',
      ': Sam unlocks Closet'
    ]);

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const lockEffect = _findEffect(level!, 'lockExit');
    const unlockEffect = _findEffect(level!, 'unlockExit');
    expect(unlockEffect.startTime).toBe(lockEffect.endTime);
    expect(_findExit(level!, 'hall', 'closet', unlockEffect.startTime).exitStatus)
      .toBe(ExitStatus.unlocked);
  });

  it('creates a half-open 500 ms lock effect on the subject', () => {
    const { level, errors } = _loadLockability(['0:00:00 Sam locks Closet']);

    expect(errors.describeErrors()).toBe('');
    const effect = _findEffect(level!, 'lockExit');
    const samI = level!.timeline.characterIdToI.sam;
    expect(effect.startTime).toBe(0);
    expect(effect.endTime).toBe(500);
    expect(createKeyframeAtTime(level!.timeline.keyframes, 0).characters[samI].effects).toContain(effect);
    expect(createKeyframeAtTime(level!.timeline.keyframes, 499).characters[samI].effects).toContain(effect);
    expect(createKeyframeAtTime(level!.timeline.keyframes, 500).characters[samI].effects).not.toContain(effect);
  });

  it('creates a half-open 500 ms unlock effect on the subject', () => {
    const text = lockabilityBaseText.replace(MAIN_EXIT_TEXT, LOCKED_MAIN_EXIT_TEXT);
    const { level, errors } = _loadLockability(['0:00:00 Sam unlocks Closet'], text);

    expect(errors.describeErrors()).toBe('');
    const effect = _findEffect(level!, 'unlockExit');
    const samI = level!.timeline.characterIdToI.sam;
    expect(effect.startTime).toBe(0);
    expect(effect.endTime).toBe(500);
    expect(createKeyframeAtTime(level!.timeline.keyframes, 499).characters[samI].effects).toContain(effect);
    expect(createKeyframeAtTime(level!.timeline.keyframes, 500).characters[samI].effects).not.toContain(effect);
  });

  it('rejects an activity overlapping the lock effect interval', () => {
    const { level, errors } = _loadLockability([
      '0:00:00 Sam locks Closet',
      '0:00:00 Sam waits 1'
    ]);

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('"sam" character can\'t "waits" because they are busy with "locks" activity');
  });

  it('allows an activity at the exact lock effect end', () => {
    const { level, errors } = _loadLockability([
      '0:00:00 Sam locks Closet',
      ': Sam waits 1'
    ]);

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(_findEffect(level!, 'lockExit').endTime).toBe(500);
  });

  it('uses a required item from character inventory', () => {
    const { level, errors } = _loadLockability(['0:00:00 Sam locks Closet']);

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(_findExit(level!, 'hall', 'closet', 0).exitStatus).toBe(ExitStatus.locked);
  });

  it('uses a required item from a character hand', () => {
    const text = lockabilityBaseText.replace('* items=Brass Key', '* leftHand=Brass Key');
    const { level, errors } = _loadLockability(['0:00:00 Sam locks Closet'], text);

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(_findExit(level!, 'hall', 'closet', 0).exitStatus).toBe(ExitStatus.locked);
  });

  it('allows the star sentinel without a corresponding item', () => {
    const text = lockabilityBaseText
      .replace('lockable with Brass Key', 'lockable with *')
      .replace('* items=Brass Key\n', '')
      .replace('## Brass Key\n', '');
    const { level, errors } = _loadLockability(['0:00:00 Sam locks Closet'], text);

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(_findExit(level!, 'hall', 'closet', 0).exitStatus).toBe(ExitStatus.locked);
  });

  it('allows locking through a bare lockable modifier without an item', () => {
    const text = lockabilityBaseText
      .replace('unlocked, lockable with Brass Key', 'unlocked, lockable')
      .replace('* items=Brass Key\n', '')
      .replace('## Brass Key\n', '');
    const { level, errors } = _loadLockability(['0:00:00 Sam locks Closet'], text);

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(_findExit(level!, 'hall', 'closet', 0).exitStatus).toBe(ExitStatus.locked);
  });

  it('allows unlocking through a bare unlockable modifier without an item', () => {
    const text = lockabilityBaseText
      .replace('unlocked, lockable with Brass Key', 'locked, unlockable')
      .replace('* items=Brass Key\n', '')
      .replace('## Brass Key\n', '');
    const { level, errors } = _loadLockability(['0:00:00 Sam unlocks Closet'], text);

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(_findExit(level!, 'hall', 'closet', 0).exitStatus).toBe(ExitStatus.unlocked);
  });

  it('allows a one-sided exit operation from its configured side', () => {
    const { level, errors } = _loadLockability(['0:00:00 Sam locks Closet']);

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
  });

  it('rejects a one-sided exit operation from its opposite side', () => {
    const text = _moveSamToCloset(lockabilityBaseText);
    const { level, errors } = _loadLockability(['0:00:00 Sam locks Hall'], text);

    expect(level).toBeNull();
    _expectActionError(errors.describeErrors(), 'lock', 'not lockable from the side sam is on');
  });

  it('rejects locking an already locked exit', () => {
    const text = lockabilityBaseText.replace(MAIN_EXIT_TEXT, LOCKED_MAIN_EXIT_TEXT);
    const { level, errors } = _loadLockability(['0:00:00 Sam locks Closet'], text);

    expect(level).toBeNull();
    _expectActionError(errors.describeErrors(), 'lock', 'exit is already locked');
  });

  it('rejects unlocking an already unlocked exit', () => {
    const { level, errors } = _loadLockability(['0:00:00 Sam unlocks Closet']);

    expect(level).toBeNull();
    _expectActionError(errors.describeErrors(), 'unlock', 'exit is already unlocked');
  });

  it('rejects locking a non-lockable door', () => {
    const text = lockabilityBaseText.replace(MAIN_EXIT_TEXT, 'Closet (closed)');
    const { level, errors } = _loadLockability(['0:00:00 Sam locks Closet'], text);

    expect(level).toBeNull();
    _expectActionError(errors.describeErrors(), 'lock', 'exit is not a lockable door');
  });

  it('rejects unlocking a non-lockable door', () => {
    const text = lockabilityBaseText.replace(MAIN_EXIT_TEXT, 'Closet (closed)');
    const { level, errors } = _loadLockability(['0:00:00 Sam unlocks Closet'], text);

    expect(level).toBeNull();
    _expectActionError(errors.describeErrors(), 'unlock', 'exit is not a lockable door');
  });

  it('rejects locking a nonadjacent room', () => {
    const text = lockabilityBaseText.replace(`${MAIN_EXIT_TEXT} | Storage`, MAIN_EXIT_TEXT);
    const { level, errors } = _loadLockability(['0:00:00 Sam locks Storage'], text);

    expect(level).toBeNull();
    _expectActionError(errors.describeErrors(), 'lock', 'not adjacent to "hall" where sam is');
  });

  it('rejects unlocking a nonadjacent room', () => {
    const text = lockabilityBaseText.replace(`${MAIN_EXIT_TEXT} | Storage`, MAIN_EXIT_TEXT);
    const { level, errors } = _loadLockability(['0:00:00 Sam unlocks Storage'], text);

    expect(level).toBeNull();
    _expectActionError(errors.describeErrors(), 'unlock', 'not adjacent to "hall" where sam is');
  });

  it('rejects locking the room occupied by the character', () => {
    const { level, errors } = _loadLockability(['0:00:00 Sam locks Hall']);

    expect(level).toBeNull();
    _expectActionError(errors.describeErrors(), 'lock', 'same room "hall" that sam is in');
  });

  it('rejects unlocking the room occupied by the character', () => {
    const { level, errors } = _loadLockability(['0:00:00 Sam unlocks Hall']);

    expect(level).toBeNull();
    _expectActionError(errors.describeErrors(), 'unlock', 'same room "hall" that sam is in');
  });

  it('rejects locking without the required item', () => {
    const text = lockabilityBaseText.replace('* items=Brass Key\n', '');
    const { level, errors } = _loadLockability(['0:00:00 Sam locks Closet'], text);

    expect(level).toBeNull();
    _expectActionError(errors.describeErrors(), 'lock', 'sam does not have "brass key" item');
  });

  it('rejects unlocking without the required item', () => {
    const text = lockabilityBaseText
      .replace(MAIN_EXIT_TEXT, LOCKED_MAIN_EXIT_TEXT)
      .replace('* items=Brass Key\n', '');
    const { level, errors } = _loadLockability(['0:00:00 Sam unlocks Closet'], text);

    expect(level).toBeNull();
    _expectActionError(errors.describeErrors(), 'unlock', 'sam does not have "brass key" item');
  });
});
