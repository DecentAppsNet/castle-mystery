import { describe, it, expect } from 'vitest';

import { createKeyframeAtTime } from '@/game/timeline';

import becomesBaseText from './fixtures/becomes/becomes-base.md?raw';
import { loadLevelForTest, replaceSection } from './testLevelUtil';

function _loadBecomes(itineraryLines:readonly string[]) {
  const text = replaceSection(becomesBaseText, 'itinerary', itineraryLines);
  return loadLevelForTest(text, 'becomes.md');
}

describe('level loading - becomes activities', () => {
  it('rejects an item becoming itself', () => {
    const { level, errors } = _loadBecomes(['0:00:00 Key becomes Key']);

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Can\'t have "key" become itself.');
  });

  it('rejects an unplaced item becoming another item', () => {
    const { level, errors } = _loadBecomes(['0:00:00 Vase becomes Key']);

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('"vase" item can\'t become "key" because "vase" isn\'t placed in a room or on a character.');
  });

  it('rejects an item becoming an item already placed on a character', () => {
    const { level, errors } = _loadBecomes(['0:00:00 Key becomes Eraser']);

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('"key" item can\'t become "eraser" because "eraser" is already placed in sam\'s left hand.');
  });

  it('replaces a room item with the target item at the same position', () => {
    const { level, errors } = _loadBecomes(['0:00:00 Key becomes Vase']);

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const snapshot = createKeyframeAtTime(level!.timeline.keyframes, 0);
    const hall = snapshot.rooms[level!.timeline.roomIdToI.hall];
    expect(hall.items.map(item => item.id)).toEqual(['vase']);
    expect(hall.items[0].position).toEqual(level!.rooms[level!.timeline.roomIdToI.hall].items[0].position);
  });

  it('replaces an item in a character left hand', () => {
    const { level, errors } = _loadBecomes(['0:00:00 Eraser becomes Vase']);

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(createKeyframeAtTime(level!.timeline.keyframes, 0)
      .characters[level!.timeline.characterIdToI.sam].leftHandItem?.id).toBe('vase');
  });

  it('replaces an item in a character right hand', () => {
    const { level, errors } = _loadBecomes(['0:00:00 Paper becomes Vase']);

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(createKeyframeAtTime(level!.timeline.keyframes, 0)
      .characters[level!.timeline.characterIdToI.sam].rightHandItem?.id).toBe('vase');
  });

  it('replaces an item in a character inventory', () => {
    const { level, errors } = _loadBecomes(['0:00:00 Pencil becomes Vase']);

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(createKeyframeAtTime(level!.timeline.keyframes, 0)
      .characters[level!.timeline.characterIdToI.sam].items.map(item => item.id)).toEqual(['vase']);
  });

  it('allows a transformed item to become its original item again', () => {
    const { level, errors } = _loadBecomes([
      '0:00:00 Key becomes Vase',
      ': Vase becomes Key'
    ]);

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const hall = createKeyframeAtTime(level!.timeline.keyframes, 0)
      .rooms[level!.timeline.roomIdToI.hall];
    expect(hall.items.map(item => item.id)).toEqual(['key']);
  });
});