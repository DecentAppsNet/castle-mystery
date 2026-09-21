// Follow test conventions from CONTRIBUTING.md when editing this file.

import { describe, expect, it } from 'vitest';

import { createKeyframeAtTime } from '@/game/timeline';

import emitsBaseText from './fixtures/emits/emits-base.md?raw';
import { loadLevelForTest, replaceSection } from './testLevelUtil';

function _loadEmits(itineraryLines:readonly string[]) {
  const text = replaceSection(emitsBaseText, 'itinerary', itineraryLines);
  return loadLevelForTest(text, 'emits.md');
}

function _expectEmitScheduled(itineraryLine:string) {
  const { level, errors } = _loadEmits([itineraryLine]);

  expect(errors.describeErrors()).toBe('');
  expect(level).not.toBeNull();
  const snapshot = createKeyframeAtTime(level!.timeline.keyframes, 0);
  const sam = snapshot.characters[level!.timeline.characterIdToI.sam];
  expect(sam.effects.some(effect => effect.kind === 'emits')).toBe(true);
}

function _expectEmitRejected(itineraryLines:readonly string[], expectedError:string) {
  const { level, errors } = _loadEmits(itineraryLines);

  expect(level).toBeNull();
  expect(errors.describeErrors()).toContain(expectedError);
}

describe('level loading - emits activities', () => {
  it('schedules an explicit character source', () => {
    _expectEmitScheduled('0:00:00 Sam emits "chime"');
  });

  it('schedules the implied character source', () => {
    _expectEmitScheduled('0:00:00 emits "chime"');
  });

  it('schedules a floor item source', () => {
    _expectEmitScheduled('0:00:00 Floor Bell emits "chime"');
  });

  it('schedules a left-hand item source', () => {
    _expectEmitScheduled('0:00:00 Left Bell emits "chime"');
  });

  it('schedules a right-hand item source loudly', () => {
    _expectEmitScheduled('0:00:00 Right Bell emits "chime" loudly');
  });

  it('rejects an invisible character source', () => {
    _expectEmitRejected([
      '0:00:00 hide Sam',
      '0:00:01 Sam emits "chime"'
    ], '"sam" can\'t emit "chime" at 0:00:01 because they are not visible.');
  });

  it('rejects a visible but unplaced character source', () => {
    _expectEmitRejected([
      '0:00:01 Ghost emits "chime"'
    ], '"ghost" can\'t emit "chime" at 0:00:01 because they are not placed in a room.');
  });

  it('rejects an invisible floor item source', () => {
    _expectEmitRejected([
      '0:00:00 hide Floor Bell',
      '0:00:01 Floor Bell emits "chime"'
    ], '"floor bell" item can\'t emit "chime" at 0:00:01 because it is not visible.');
  });

  it('rejects an invisible held item source', () => {
    _expectEmitRejected([
      '0:00:00 hide Left Bell',
      '0:00:01 Left Bell emits "chime"'
    ], '"left bell" item can\'t emit "chime" at 0:00:01 because it is not visible.');
  });

  it('rejects an inventory item source', () => {
    _expectEmitRejected([
      '0:00:01 Inventory Bell emits "chime"'
    ], '"inventory bell" item can\'t emit "chime" at 0:00:01 because it is in inventory.');
  });

  it('rejects an unplaced item source', () => {
    _expectEmitRejected([
      '0:00:01 Unplaced Bell emits "chime"'
    ], '"unplaced bell" item can\'t emit "chime" at 0:00:01 because it is not placed in a room or held by a character.');
  });
});
