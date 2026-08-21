import { describe, expect, it } from 'vitest';

import { createKeyframeAtTime } from '@/game/timeline';
import dropsOnItemText from './fixtures/drops-on-item.md?raw';
import { loadLevelForTest } from './testLevelUtil';

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
});