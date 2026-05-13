import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { clearSeed, setSeed } from '@/common/randUtil';
import { createGameState, findCharacter } from '../gameUtil';
import { loadLevelFromText } from '../levelUtil';
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
    const beforeDropState = createGameState({ ...level, startTime:4_000 });
    const afterDropState = createGameState({ ...level, startTime:5_000 });
    const beforeHero = findCharacter(beforeDropState, 'Hero');
    const afterHero = findCharacter(afterDropState, 'Hero');
    const afterRoom = findRoom(afterDropState.rooms, 'Hall');

    expect(beforeHero.items.map(item => item.id)).toContain('Book');
    expect(findRoom(beforeDropState.rooms, 'Hall').items.map(item => item.id)).not.toContain('Book');
    expect(afterHero.items.map(item => item.id)).not.toContain('Book');
    const droppedItem = afterRoom.items.find(item => item.id === 'Book') || null;
    expect(droppedItem).not.toBeNull();
    expect(droppedItem?.position).toEqual({ x:afterHero.x, y:afterHero.y });
  });
});
