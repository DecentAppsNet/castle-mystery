import { describe, expect, it } from 'vitest';

import { createKeyframeAtTime, findCharacterPositionAtTime } from '@/game/timeline';
import { findRoomAtPosition } from '@/game/roomUtil';
import { findCharacterOwnedItem } from '@/game/itemOwnershipUtil';
import Level from '@/game/types/Level';
import givesBaseText from './fixtures/gives/gives-base.md?raw';
import givesConcurrentlyText from './fixtures/gives/gives-concurrently.md?raw';
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

function _findGiveEffect(level:Level, characterId:string = 'sam') {
  const characterI = level.timeline.characterIdToI[characterId];
  const effect = level.timeline.keyframes.flatMap(keyframe => keyframe.characters[characterI].effects)
    .find(candidate => candidate.kind === 'giveItem' && candidate.handler !== null);
  expect(effect).toBeDefined();
  return effect!;
}

/** Verifies ownership and the drawable giver effect across a give's boundaries. */
function _expectGiveBoundaries(level:Level, itemId:string) {
  const effect = _findGiveEffect(level);
  const samI = level.timeline.characterIdToI.sam;
  const joI = level.timeline.characterIdToI.jo;
  const start = createKeyframeAtTime(level.timeline.keyframes, effect.startTime);
  const beforeEnd = createKeyframeAtTime(level.timeline.keyframes, effect.endTime - 1);
  const end = createKeyframeAtTime(level.timeline.keyframes, effect.endTime);

  expect(findCharacterOwnedItem(start.characters[samI], itemId)).toBeDefined();
  expect(findCharacterOwnedItem(start.characters[joI], itemId)).toBeNull();
  expect(start.characters[samI].effects).toContain(effect);
  expect(start.characters[joI].effects.some(candidate => candidate.kind === 'giveItem')).toBe(false);
  expect(findCharacterOwnedItem(beforeEnd.characters[samI], itemId)).toBeDefined();
  expect(findCharacterOwnedItem(beforeEnd.characters[joI], itemId)).toBeNull();
  expect(beforeEnd.characters[samI].effects).toContain(effect);
  expect(beforeEnd.characters[joI].effects.some(candidate => candidate.kind === 'giveItem')).toBe(false);
  expect(findCharacterOwnedItem(end.characters[samI], itemId)).toBeNull();
  expect(end.characters[joI].items.filter(item => item.id === itemId)).toHaveLength(1);
  expect(end.characters[samI].effects.some(candidate => candidate.kind === 'giveItem')).toBe(false);
  expect(end.characters[joI].effects.some(candidate => candidate.kind === 'giveItem')).toBe(false);
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
    const effect = _findGiveEffect(level!);
    expect(effect.endTime).toBe(transferTime);
    expect(before.characters[samI].effects).toContain(effect);
    expect(before.characters[joI].effects.some(candidate => candidate.kind === 'giveItem')).toBe(false);
    expect(before.characters[samI].items.map(item => item.id)).toEqual(['coin', 'ring']);
    expect(before.characters[joI].items.map(item => item.id)).toEqual(['book']);
    expect(transfer.characters[samI].items.map(item => item.id)).toEqual(['ring']);
    expect(transfer.characters[joI].items.map(item => item.id)).toEqual(['book', 'coin']);
    expect(transfer.characters[samI].position).not.toEqual(level!.timeline.keyframes[0].characters[samI].position);
    expect(transfer.characters[samI].leftHandItem?.id).toBe('key');
    expect(transfer.characters[samI].rightHandItem?.id).toBe('vase');
    expect(transfer.characters[joI].leftHandItem?.id).toBe('feather');
    expect(transfer.characters[joI].rightHandItem?.id).toBe('paper');
    expect(transfer.characters[samI].effects).not.toContain(effect);
    expect(transfer.characters[joI].effects.some(candidate => candidate.kind === 'giveItem')).toBe(false);
  });

  it('transfers an inventory item exactly at the give effect end', () => {
    const { level, errors } = _loadGivesActivity('0:00:00 Sam gives Coin to Jo');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    _expectGiveBoundaries(level!, 'coin');
  });

  it('transfers a left-hand item into receiver inventory', () => {
    const { level, errors } = _loadGivesActivity('0:00:00 Sam gives Key to Jo');

    expect(errors.describeErrors()).toBe('');
    const snapshot = createKeyframeAtTime(level!.timeline.keyframes, _findTransferTime(level!, 'key'));
    expect(snapshot.characters[level!.timeline.characterIdToI.sam].leftHandItem).toBeNull();
    expect(snapshot.characters[level!.timeline.characterIdToI.jo].items.map(item => item.id)).toEqual(['book', 'key']);
    expect(_findGiveEffect(level!).endTime).toBe(_findTransferTime(level!, 'key'));
  });

  it('transfers a left-hand item exactly at the give effect end', () => {
    const { level, errors } = _loadGivesActivity('0:00:00 Sam gives Key to Jo');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    _expectGiveBoundaries(level!, 'key');
  });

  it('transfers a right-hand item into receiver inventory', () => {
    const { level, errors } = _loadGivesActivity('0:00:00 Sam gives Vase to Jo');

    expect(errors.describeErrors()).toBe('');
    const snapshot = createKeyframeAtTime(level!.timeline.keyframes, _findTransferTime(level!, 'vase'));
    expect(snapshot.characters[level!.timeline.characterIdToI.sam].rightHandItem).toBeNull();
    expect(snapshot.characters[level!.timeline.characterIdToI.jo].items.map(item => item.id)).toEqual(['book', 'vase']);
    expect(_findGiveEffect(level!).endTime).toBe(_findTransferTime(level!, 'vase'));
  });

  it('transfers a right-hand item exactly at the give effect end', () => {
    const { level, errors } = _loadGivesActivity('0:00:00 Sam gives Vase to Jo');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    _expectGiveBoundaries(level!, 'vase');
  });

  it('completes giver movement before starting the give effect', () => {
    const { level, errors } = _loadGivesActivity('0:00:00 Sam gives Coin to Jo');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const effect = _findGiveEffect(level!);
    const samI = level!.timeline.characterIdToI.sam;
    const startPosition = findCharacterPositionAtTime(level!.timeline.keyframes, samI, effect.startTime);
    const endPosition = findCharacterPositionAtTime(level!.timeline.keyframes, samI, effect.endTime);
    expect(effect.startTime).toBeGreaterThan(level!.startTime);
    expect(startPosition).not.toEqual(level!.timeline.keyframes[0].characters[samI].position);
    expect(endPosition).toEqual(startPosition);
  });

  it('turns the giver to face the receiver before starting the give effect', () => {
    const text = givesBaseText.replace('S..J', 'J..S');
    const { level, errors } = loadLevelForTest(text, 'gives-facing.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const effect = _findGiveEffect(level!);
    const effectStart = createKeyframeAtTime(level!.timeline.keyframes, effect.startTime);
    expect(effectStart.characters[level!.timeline.characterIdToI.sam].facingDirection).toBe('left');
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
    const transferTime = _findTransferTime(level!, 'coin');
    const snapshot = createKeyframeAtTime(level!.timeline.keyframes, transferTime);
    const samI = level!.timeline.characterIdToI.sam;
    const joI = level!.timeline.characterIdToI.jo;
    expect(snapshot.characters[samI].position).toEqual(level!.timeline.keyframes[0].characters[samI].position);
    expect(snapshot.characters[samI].items).toEqual([]);
    expect(snapshot.characters[joI].items.map(item => item.id)).toEqual(['coin']);
    expect(_findGiveEffect(level!).endTime).toBe(transferTime);
  });

  it('starts subsequent receiver movement after the give activity ends', () => {
    const text = replaceSection(givesBaseText, 'itinerary', [
      '0:00:00 Sam gives Coin to Jo',
      ': Jo @ Closet'
    ]);
    const { level, errors } = loadLevelForTest(text, 'gives-then-receiver-moves.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const effectEndTime = _findGiveEffect(level!).endTime;
    const joI = level!.timeline.characterIdToI.jo;
    const positionAtEffectEnd = findCharacterPositionAtTime(level!.timeline.keyframes, joI, effectEndTime);
    const finalPosition = findCharacterPositionAtTime(level!.timeline.keyframes, joI, level!.endTime);
    expect(positionAtEffectEnd).toEqual(level!.timeline.keyframes[0].characters[joI].position);
    expect(findRoomAtPosition(level!.rooms, finalPosition.x, finalPosition.y)?.id).toBe('closet');
  });

  it('allows the giver to begin another item operation at the exact give effect end', () => {
    const text = replaceSection(givesBaseText, 'itinerary', [
      '0:00:00 Sam gives Coin to Jo',
      ': Sam gives Ring to Jo'
    ]);
    const { level, errors } = loadLevelForTest(text, 'gives-then-giver-gives.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const effects = level!.timeline.keyframes.flatMap(keyframe =>
      keyframe.characters[level!.timeline.characterIdToI.sam].effects)
      .filter(effect => effect.kind === 'giveItem' && effect.handler !== null);
    expect(effects).toHaveLength(2);
    expect(effects[1].startTime).toBe(effects[0].endTime);
  });

  it('allows the receiver to begin another item operation at the exact give effect end', () => {
    const text = replaceSection(givesBaseText, 'itinerary', [
      '0:00:00 Sam gives Coin to Jo',
      ': Jo gives Book to Sam'
    ]);
    const { level, errors } = loadLevelForTest(text, 'gives-then-receiver-gives.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const firstEffect = _findGiveEffect(level!);
    const secondEffect = _findGiveEffect(level!, 'jo');
    expect(secondEffect.startTime).toBe(firstEffect.endTime);
  });

  it('allows independent character pairs to give concurrently in one room', () => {
    const { level, errors } = loadLevelForTest(givesConcurrentlyText, 'gives-concurrently.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const samEffect = _findGiveEffect(level!, 'sam');
    const patEffect = _findGiveEffect(level!, 'pat');
    expect(patEffect.startTime).toBe(samEffect.startTime);
    const end = createKeyframeAtTime(level!.timeline.keyframes, samEffect.endTime);
    expect(end.characters[level!.timeline.characterIdToI.jo].items.map(item => item.id)).toEqual(['coin']);
    expect(end.characters[level!.timeline.characterIdToI.kai].items.map(item => item.id)).toEqual(['vase']);
  });

  it('appends sequentially given items to receiver inventory in scheduling order', () => {
    const text = replaceSection(givesBaseText, 'itinerary', [
      '0:00:00 Sam gives Coin to Jo',
      ': Sam gives Ring to Jo'
    ]);
    const { level, errors } = loadLevelForTest(text, 'gives-sequentially.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const end = createKeyframeAtTime(level!.timeline.keyframes, level!.endTime);
    expect(end.characters[level!.timeline.characterIdToI.jo].items.map(item => item.id))
      .toEqual(['book', 'coin', 'ring']);
  });

  it('rejects giving while the giver is busy with another item-transfer activity', () => {
    const { level, errors } = loadLevelForTest(givesGiverReservedText, 'gives-giver-reserved.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('"sam" character can\'t "gives" because they are busy with "drops" activity');
  });

  it('rejects giving while the receiver is busy with another item-transfer activity', () => {
    const { level, errors } = loadLevelForTest(givesReceiverReservedText, 'gives-receiver-reserved.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('"jo" character can\'t "gives" because they are busy with "drops" activity');
  });
});
