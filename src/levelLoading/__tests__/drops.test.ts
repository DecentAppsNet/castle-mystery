import { describe, expect, it } from 'vitest';

import { calcItemCuboidHeightGame } from '@/game/itemSizeUtil';
import { createKeyframeAtTime } from '@/game/timeline';
import dropsOnItemText from './fixtures/drops-on-item.md?raw';
import { loadLevelForTest } from './testLevelUtil';

describe('level loading - drops activities', () => {
  it('stacks a dropped item above its target room item', () => {
    const { level, errors } = loadLevelForTest(dropsOnItemText, 'drops-on-item.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const snapshot = createKeyframeAtTime(level!.timeline.keyframes, 60_000);
    const closet = level!.rooms.find(room => room.id === 'closet')!;
    const closetKeyframe = snapshot.rooms[level!.timeline.roomIdToI.closet];
    const table = closetKeyframe.items.find(item => item.id === 'table')!;
    const book = closetKeyframe.items.find(item => item.id === 'book')!;
    const vase = closetKeyframe.items.find(item => item.id === 'vase')!;
    const itemHeight = calcItemCuboidHeightGame(closet);

    expect(book.position.y).toBe(table.position.y - itemHeight);
    expect(vase.position.x).toBe(table.position.x);
    expect(vase.position.y).toBe(table.position.y - itemHeight * 2);
    expect(vase.position.z).toBe(table.position.z);
    expect(snapshot.characters[level!.timeline.characterIdToI.sam].rightHandItem).toBeNull();
  });
});