import { describe, expect, it } from 'vitest';

import { createKeyframeAtTime } from '@/game/timeline';
import { CharacterOwnedItemPlacement, INVENTORY, LEFT_HAND, RIGHT_HAND } from '@/game/itemOwnershipUtil';
import dropsOnItemText from './fixtures/drops-on-item.md?raw';
import { loadLevelForTest } from './testLevelUtil';

function _loadDropFrom(sourcePlacement:CharacterOwnedItemPlacement) {
  const takeTarget = sourcePlacement === INVENTORY ? '' : ` in ${sourcePlacement}`;
  const text = dropsOnItemText.replace('takes Vase in right hand', `takes Vase${takeTarget}`);
  return loadLevelForTest(text, 'drops-on-item.md');
}

describe('level loading - drops activities', () => {
  it('appends a dropped item at its target item floor square and removes it from the character', () => {
    const { level, errors } = loadLevelForTest(dropsOnItemText, 'drops-on-item.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const snapshot = createKeyframeAtTime(level!.timeline.keyframes, 60_000);
    const closet = snapshot.rooms[level!.timeline.roomIdToI.closet];
    const table = closet.items.find(item => item.id === 'table')!;
    const vase = closet.items.find(item => item.id === 'vase')!;
    const sam = snapshot.characters[level!.timeline.characterIdToI.sam];

    expect(vase.position).toEqual(table.position);
    expect(closet.items.map(item => item.id)).toEqual(['table', 'book', 'vase']);
    expect(sam.leftHandItem).toBeNull();
    expect(sam.rightHandItem).toBeNull();
    expect(sam.items.map(item => item.id)).not.toContain('vase');
  });

  it('transfers an inventory item exactly at the drop effect end', () => {
    const { level, errors } = _loadDropFrom(INVENTORY);

    expect(errors.describeErrors()).toBe('');
    const samI = level!.timeline.characterIdToI.sam;
    const closetI = level!.timeline.roomIdToI.closet;
    const effect = level!.timeline.keyframes.flatMap(keyframe => keyframe.characters[samI].effects)
      .find(effect => effect.kind === 'dropItem')!;

    for (const time of [effect.startTime, effect.endTime - 1]) {
      const snapshot = createKeyframeAtTime(level!.timeline.keyframes, time);
      expect(snapshot.characters[samI].effects).toContain(effect);
      expect(snapshot.characters[samI].items.map(item => item.id)).toContain('vase');
      expect(snapshot.rooms[closetI].items.map(item => item.id)).not.toContain('vase');
    }

    const endSnapshot = createKeyframeAtTime(level!.timeline.keyframes, effect.endTime);
    expect(endSnapshot.characters[samI].effects).not.toContain(effect);
    expect(endSnapshot.rooms[closetI].items.map(item => item.id)).toEqual(['table', 'book', 'vase']);
    expect(endSnapshot.characters[samI].items.map(item => item.id)).not.toContain('vase');
  });

  it('transfers a left-hand item exactly at the drop effect end', () => {
    const { level, errors } = _loadDropFrom(LEFT_HAND);

    expect(errors.describeErrors()).toBe('');
    const samI = level!.timeline.characterIdToI.sam;
    const closetI = level!.timeline.roomIdToI.closet;
    const effect = level!.timeline.keyframes.flatMap(keyframe => keyframe.characters[samI].effects)
      .find(effect => effect.kind === 'dropItem')!;

    for (const time of [effect.startTime, effect.endTime - 1]) {
      const snapshot = createKeyframeAtTime(level!.timeline.keyframes, time);
      expect(snapshot.characters[samI].effects).toContain(effect);
      expect(snapshot.characters[samI].leftHandItem?.id).toBe('vase');
      expect(snapshot.rooms[closetI].items.map(item => item.id)).not.toContain('vase');
    }

    const endSnapshot = createKeyframeAtTime(level!.timeline.keyframes, effect.endTime);
    expect(endSnapshot.characters[samI].effects).not.toContain(effect);
    expect(endSnapshot.rooms[closetI].items.map(item => item.id)).toEqual(['table', 'book', 'vase']);
    expect(endSnapshot.characters[samI].leftHandItem).toBeNull();
  });

  it('transfers a right-hand item exactly at the drop effect end', () => {
    const { level, errors } = _loadDropFrom(RIGHT_HAND);

    expect(errors.describeErrors()).toBe('');
    const samI = level!.timeline.characterIdToI.sam;
    const closetI = level!.timeline.roomIdToI.closet;
    const effect = level!.timeline.keyframes.flatMap(keyframe => keyframe.characters[samI].effects)
      .find(effect => effect.kind === 'dropItem')!;

    for (const time of [effect.startTime, effect.endTime - 1]) {
      const snapshot = createKeyframeAtTime(level!.timeline.keyframes, time);
      expect(snapshot.characters[samI].effects).toContain(effect);
      expect(snapshot.characters[samI].rightHandItem?.id).toBe('vase');
      expect(snapshot.rooms[closetI].items.map(item => item.id)).not.toContain('vase');
    }

    const endSnapshot = createKeyframeAtTime(level!.timeline.keyframes, effect.endTime);
    expect(endSnapshot.characters[samI].effects).not.toContain(effect);
    expect(endSnapshot.rooms[closetI].items.map(item => item.id)).toEqual(['table', 'book', 'vase']);
    expect(endSnapshot.characters[samI].rightHandItem).toBeNull();
  });

  it('rejects another item operation by a character during an active drop', () => {
    const text = dropsOnItemText.replace(': drops Vase on Table', [
      '0:00:06 Sam drops Vase on Table',
      '0:00:06 Sam takes Vase into inventory'
    ].join('\n'));
    const { level, errors } = loadLevelForTest(text, 'overlapping-drop.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('"sam" character is already transferring an item.');
  });

  it('allows simultaneous drops by different characters into the same room', () => {
    const text = dropsOnItemText
      .replace('.t..\n....\n....\n```\n\n* t=Table|Book',
        '.t..\n....\n...J\n```\n\n* t=Table|Book\n* J=Jo')
      .replace('## Sam\n\n# items', '## Sam\n\n## Jo\n* items=Coin\n\n# items')
      .replace('## Book\n', '## Book\n\n## Coin\n')
      .replace('0:00:06 Sam @ Closet\n: drops Vase on Table', [
        '0:00:06 Sam @ Closet',
        '0:00:06 Sam drops Vase on Table',
        '0:00:06 Jo drops Coin on Table'
      ].join('\n'));
    const { level, errors } = loadLevelForTest(text, 'same-room-drops.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const snapshot = createKeyframeAtTime(level!.timeline.keyframes, 60_000);
    expect(snapshot.rooms[level!.timeline.roomIdToI.closet].items.map(item => item.id))
      .toEqual(['table', 'book', 'vase', 'coin']);
  });
});