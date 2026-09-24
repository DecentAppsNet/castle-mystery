import { describe, expect, it } from 'vitest';

import { findCharacterOwnedItem } from '@/game/itemOwnershipUtil';
import { createCharacterKeyframeAtTime, createKeyframeAtTime } from '@/game/timeline';
import Level from '@/game/types/Level';

import defaultLevelText from './fixtures/stands-base.md?raw';
import { loadLevelForTest, replaceSection } from './testLevelUtil';

function _loadSamBodyOrientation(itineraryLines:readonly string[], time:number) {
  const text = replaceSection(defaultLevelText, 'itinerary', itineraryLines);
  const { level, errors } = loadLevelForTest(text, 'stands.md');

  expect(errors.describeErrors()).toBe('');
  expect(level).not.toBeNull();
  const samI = level!.timeline.characterIdToI.sam;
  return createCharacterKeyframeAtTime(level!.timeline.keyframes, samI, time).bodyOrientation;
}

function _loadStandsActivity(itineraryLines:readonly string[], text:string = defaultLevelText) {
  return loadLevelForTest(replaceSection(text, 'itinerary', itineraryLines), 'stands.md');
}

function _expectSamEndsAtItem(activityText:string, itemId:string):void {
  const { level, errors } = _loadStandsActivity([activityText]);

  expect(errors.describeErrors()).toBe('');
  expect(level).not.toBeNull();
  const end = createKeyframeAtTime(level!.timeline.keyframes, level!.endTime);
  const sam = end.characters[level!.timeline.characterIdToI.sam];
  const item = end.rooms.flatMap(room => room.items).find(candidate => candidate.id === itemId);
  expect(sam.position).toEqual(item?.position);
}

function _findRoomItem(level:Level, itemId:string, time:number) {
  return createKeyframeAtTime(level.timeline.keyframes, time).rooms
    .flatMap(room => room.items).find(item => item.id === itemId);
}

describe('level loading - stands activities', () => {
  it('loads stands activity with an absolute timestamp', () => {
    const bodyOrientation = _loadSamBodyOrientation([
      '0:00:00 Sam sits',
      '0:00:01 Sam stands'
    ], 1_000);

    expect(bodyOrientation).toBe('standing');
  });

  it('loads stands activity with a relative timestamp', () => {
    const bodyOrientation = _loadSamBodyOrientation([
      '0:00:00 Sam waits 1',
      ': stands'
    ], 1_000);

    expect(bodyOrientation).toBe('standing');
  });

  it('stands activity with implied subject defaults to active character', () => {
    const bodyOrientation = _loadSamBodyOrientation(['0:00:00 stands'], 0);

    expect(bodyOrientation).toBe('standing');
  });

  it('accepts on as a target preposition', () => {
    _expectSamEndsAtItem('0:00:00 Sam stands on Rug', 'rug');
  });

  it('accepts above as an equivalent target preposition', () => {
    _expectSamEndsAtItem('0:00:00 Sam stands above Rug', 'rug');
  });

  it('accepts in as an equivalent target preposition', () => {
    _expectSamEndsAtItem('0:00:00 Sam stands in Rug', 'rug');
  });

  it('accepts over as an equivalent target preposition', () => {
    _expectSamEndsAtItem('0:00:00 Sam stands over Rug', 'rug');
  });

  it('accepts at as an equivalent target preposition', () => {
    _expectSamEndsAtItem('0:00:00 Sam stands at Rug', 'rug');
  });

  it('starts standing and facing toward the target at the authored timestamp', () => {
    const { level, errors } = _loadStandsActivity([
      '0:00:00 Jo waits 1',
      '0:00:01 Sam stands on Rug'
    ]);

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const samI = level!.timeline.characterIdToI.sam;
    const beforeStart = createCharacterKeyframeAtTime(level!.timeline.keyframes, samI, 999);
    const start = createCharacterKeyframeAtTime(level!.timeline.keyframes, samI, 1_000);
    const end = createCharacterKeyframeAtTime(level!.timeline.keyframes, samI, level!.endTime);
    const rug = _findRoomItem(level!, 'rug', 1_000);

    expect(beforeStart.bodyOrientation).toBe('sitting');
    expect(start.bodyOrientation).toBe('standing');
    expect(start.facingDirection).toBe('left');
    expect(end.position).toEqual(rug?.position);
  });

  it('starts a relative successor when targeted travel ends', () => {
    const { level, errors } = _loadStandsActivity([
      '0:00:00 Sam stands on Rug',
      ': Sam sits'
    ]);

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const samI = level!.timeline.characterIdToI.sam;
    expect(createCharacterKeyframeAtTime(level!.timeline.keyframes, samI, level!.endTime - 1).bodyOrientation)
      .toBe('standing');
    expect(createCharacterKeyframeAtTime(level!.timeline.keyframes, samI, level!.endTime).bodyOrientation)
      .toBe('sitting');
  });

  it('allows an already-reached target with zero additional duration', () => {
    const first = _loadStandsActivity(['0:00:00 Sam stands on Rug', ': Sam sits']);
    const repeated = _loadStandsActivity([
      '0:00:00 Sam stands on Rug',
      ': Sam stands on Rug',
      ': Sam sits'
    ]);

    expect(first.errors.describeErrors()).toBe('');
    expect(repeated.errors.describeErrors()).toBe('');
    expect(repeated.level?.endTime).toBe(first.level?.endTime);
  });

  it('allows a hidden room item as a target', () => {
    _expectSamEndsAtItem('0:00:00 Sam stands at Marker', 'marker');
  });

  it('does not mutate the target item', () => {
    const { level, errors } = _loadStandsActivity(['0:00:00 Sam stands on Rug']);

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(_findRoomItem(level!, 'rug', level!.endTime)).toEqual(_findRoomItem(level!, 'rug', 0));
  });

  it('does not reserve or chase a target item that moves later', () => {
    const { level, errors } = _loadStandsActivity([
      '0:00:00 Sam stands on Rug',
      '0:00:00 Jo takes Rug'
    ]);

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const start = createKeyframeAtTime(level!.timeline.keyframes, 0);
    const rug = start.rooms[level!.timeline.roomIdToI.hall].items.find(item => item.id === 'rug');
    const end = createKeyframeAtTime(level!.timeline.keyframes, level!.endTime);
    const sam = end.characters[level!.timeline.characterIdToI.sam];
    const jo = end.characters[level!.timeline.characterIdToI.jo];

    expect(sam.position).toEqual(rug?.position);
    expect(findCharacterOwnedItem(jo, 'rug')?.item).toEqual(rug);
  });

  it('errors when the target item is in another room', () => {
    const { level, errors } = _loadStandsActivity(['0:00:00 Sam stands at Vase']);

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('"vase" item is in "closet" room, not "hall" room');
  });

  it('errors when the target item is owned by the actor', () => {
    const { level, errors } = _loadStandsActivity(['0:00:00 Sam stands at Eraser']);

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('"eraser" item is owned by "sam" character');
  });

  it('errors when the target item is owned by another character', () => {
    const { level, errors } = _loadStandsActivity(['0:00:00 Sam stands at Coin']);

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('"coin" item is owned by "jo" character');
  });

  it('errors when the target item is not currently placed', () => {
    const { level, errors } = _loadStandsActivity(['0:00:00 Sam stands at Relic']);

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('"relic" item is not in "hall" room with "sam" character');
  });

});
