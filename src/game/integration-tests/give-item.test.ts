// Follow test conventions from CONTRIBUTING.md when editing this file.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { clearSeed, setSeed } from '@/common/randUtil';
import { loadLevelFromText } from '@/levelLoading/levelUtil';
import { createGameState, findCharacter } from '../gameUtil';
import ItineraryEventType from '../types/itineraryEvents/ItineraryEventType';
import giveItemWalkText from './fixtures/give-item-walk.md?raw';

describe('give item integration', () => {
  beforeEach(() => {
    setSeed(1);
  });

  afterEach(() => {
    clearSeed();
  });

  it('transfers the item from giver to recipient when the give event is reached', () => {
    const level = loadLevelFromText(giveItemWalkText);
    const king = level.characters.find(character => character.id === 'king');
    const giveEvent = king?.itinerary.find(event => event.type === ItineraryEventType.GIVE_ITEM) as { startTime:number } | undefined;
    const beforeGiveState = createGameState({ ...level, initialTime:giveEvent!.startTime - 1 });
    const atGiveState = createGameState({ ...level, initialTime:giveEvent!.startTime });
    const beforeKing = findCharacter(beforeGiveState, 'King');
    const beforeQueen = findCharacter(beforeGiveState, 'Queen');
    const atGiveKing = findCharacter(atGiveState, 'King');
    const atGiveQueen = findCharacter(atGiveState, 'Queen');

    expect(giveEvent).toBeDefined();
    expect(beforeKing.items.map(item => item.id)).toContain('book');
    expect(beforeQueen.items.map(item => item.id)).not.toContain('book');
    expect(atGiveKing.items.map(item => item.id)).not.toContain('book');
    expect(atGiveQueen.items.map(item => item.id)).toContain('book');
  });
});
