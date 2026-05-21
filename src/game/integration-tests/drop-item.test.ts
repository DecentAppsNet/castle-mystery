// Follow test conventions from CONTRIBUTING.md when editing this file.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { clearSeed, setSeed } from '@/common/randUtil';
import { loadLevelFromText } from '@/levelLoading/levelUtil';
import { createGameState, findCharacter } from '../gameUtil';
import { findRoom } from '../roomUtil';
import dropItemText from './fixtures/drop-item.md?raw';

describe('drop item integration', () => {
  beforeEach(() => {
    setSeed(1);
  });

  afterEach(() => {
    clearSeed();
  });

  it('moves a dropped item from the character inventory to the room at the current waypoint', () => {
    const level = loadLevelFromText(dropItemText);
    const beforeDropState = createGameState({ ...level, initialTime:4_000 });
    const afterDropState = createGameState({ ...level, initialTime:5_000 });
    const beforeHero = findCharacter(beforeDropState, 'Hero');
    const afterHero = findCharacter(afterDropState, 'Hero');
    const afterRoom = findRoom(afterDropState.rooms, 'Hall');

    expect(beforeHero.items.map(item => item.id)).toContain('book');
    expect(findRoom(beforeDropState.rooms, 'Hall').items.map(item => item.id)).not.toContain('book');
    expect(afterHero.items.map(item => item.id)).not.toContain('book');
    const droppedItem = afterRoom.items.find(item => item.id === 'book') || null;
    expect(droppedItem).not.toBeNull();
    expect(afterDropState.itemsById.get('book')).toBe(droppedItem);
    expect(droppedItem?.position).toEqual({ x:afterHero.x, y:afterHero.y });
  });
});
