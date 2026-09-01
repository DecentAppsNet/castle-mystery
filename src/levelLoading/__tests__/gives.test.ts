import { describe, expect, it } from 'vitest';

import { createKeyframeAtTime } from '@/game/timeline';
import Level from '@/game/types/Level';
import givesBaseText from './fixtures/gives/gives-base.md?raw';
import givesCrowdedText from './fixtures/gives/gives-crowded.md?raw';
import givesGiverReservedText from './fixtures/gives/gives-giver-reserved.md?raw';
import givesReceiverReservedText from './fixtures/gives/gives-receiver-reserved.md?raw';
import { loadLevelForTest, replaceSection } from './testLevelUtil';

function _loadGivesActivity(activityText:string) {
  return loadLevelForTest(replaceSection(givesBaseText, 'itinerary', [activityText]), 'gives.md');
}

function _findTransferTime(level:Level, itemId:string):number {
  const toCharacterI = level.timeline.characterIdToI.jo;
  const keyframe = level.timeline.keyframes.find(candidate =>
    candidate.characters[toCharacterI].items.some(item => item.id === itemId));
  expect(keyframe).toBeDefined();
  return keyframe!.time;
}

function _expectNoGiveEffect(level:Level) {
  expect(level.timeline.keyframes.flatMap(keyframe => keyframe.characters)
    .flatMap(character => character.effects).some(effect => effect.kind === 'giveItem')).toBe(false);
}

describe('level loading - gives activities', () => {
  it('moves the giver and transfers an inventory item while preserving unrelated contents', () => {
    const { level, errors } = _loadGivesActivity('0:00:00 Sam gives Coin to Jo');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const transferTime = _findTransferTime(level!, 'coin');
    const before = createKeyframeAtTime(level!.timeline.keyframes, transferTime - 1);
    const transfer = createKeyframeAtTime(level!.timeline.keyframes, transferTime);
    const samI = level!.timeline.characterIdToI.sam;
    const joI = level!.timeline.characterIdToI.jo;

    expect(transferTime).toBeGreaterThan(0);
    expect(before.characters[samI].items.map(item => item.id)).toEqual(['coin', 'ring']);
    expect(before.characters[joI].items.map(item => item.id)).toEqual(['book']);
    expect(transfer.characters[samI].items.map(item => item.id)).toEqual(['ring']);
    expect(transfer.characters[joI].items.map(item => item.id)).toEqual(['book', 'coin']);
    expect(transfer.characters[samI].position).not.toEqual(level!.timeline.keyframes[0].characters[samI].position);
    expect(transfer.characters[samI].leftHandItem?.id).toBe('key');
    expect(transfer.characters[samI].rightHandItem?.id).toBe('vase');
    expect(transfer.characters[joI].leftHandItem?.id).toBe('feather');
    expect(transfer.characters[joI].rightHandItem?.id).toBe('paper');
    _expectNoGiveEffect(level!);
  });

  it('transfers a left-hand item into receiver inventory', () => {
    const { level, errors } = _loadGivesActivity('0:00:00 Sam gives Key to Jo');

    expect(errors.describeErrors()).toBe('');
    const snapshot = createKeyframeAtTime(level!.timeline.keyframes, _findTransferTime(level!, 'key'));
    expect(snapshot.characters[level!.timeline.characterIdToI.sam].leftHandItem).toBeNull();
    expect(snapshot.characters[level!.timeline.characterIdToI.jo].items.map(item => item.id)).toEqual(['book', 'key']);
    _expectNoGiveEffect(level!);
  });

  it('transfers a right-hand item into receiver inventory', () => {
    const { level, errors } = _loadGivesActivity('0:00:00 Sam gives Vase to Jo');

    expect(errors.describeErrors()).toBe('');
    const snapshot = createKeyframeAtTime(level!.timeline.keyframes, _findTransferTime(level!, 'vase'));
    expect(snapshot.characters[level!.timeline.characterIdToI.sam].rightHandItem).toBeNull();
    expect(snapshot.characters[level!.timeline.characterIdToI.jo].items.map(item => item.id)).toEqual(['book', 'vase']);
    _expectNoGiveEffect(level!);
  });

  it('rejects giving an item to the giver', () => {
    const { level, errors } = _loadGivesActivity('0:00:00 Sam gives Coin to Sam');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('can\'t give an item to themselves');
  });

  it('rejects giving to a character in another room', () => {
    const { level, errors } = _loadGivesActivity('0:00:00 Sam gives Coin to Pat');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('is not in "hall" room with "sam" character');
  });

  it('rejects giving an item the giver does not own', () => {
    const { level, errors } = _loadGivesActivity('0:00:00 Sam gives Book to Jo');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('"sam" character does not have "book"');
  });

  it('falls back to transferring in place when every interaction waypoint is occupied', () => {
    const { level, errors } = loadLevelForTest(givesCrowdedText, 'gives-crowded.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const snapshot = createKeyframeAtTime(level!.timeline.keyframes, 0);
    const samI = level!.timeline.characterIdToI.sam;
    const joI = level!.timeline.characterIdToI.jo;
    expect(snapshot.characters[samI].position).toEqual(level!.timeline.keyframes[0].characters[samI].position);
    expect(snapshot.characters[samI].items).toEqual([]);
    expect(snapshot.characters[joI].items.map(item => item.id)).toEqual(['coin']);
    _expectNoGiveEffect(level!);
  });

  it('rejects giving while the giver has an active item-transfer reservation', () => {
    const { level, errors } = loadLevelForTest(givesGiverReservedText, 'gives-giver-reserved.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('"sam" character is already transferring an item');
  });

  it('rejects giving while the receiver has an active item-transfer reservation', () => {
    const { level, errors } = loadLevelForTest(givesReceiverReservedText, 'gives-receiver-reserved.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('"jo" character is already transferring an item');
  });
});
