// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import { loadLevelFromText } from '@/levelLoading/levelUtil';
import ItineraryEventType from '../types/itineraryEvents/ItineraryEventType';
import { createGameState } from '../gameUtil';
import { findRoom } from '../roomUtil';
import becomesItemText from './fixtures/becomes-item.md?raw';

describe('becomes item integration', () => {
  it('replaces a room item with its declared unplaced target at the authored time', () => {
    const level = loadLevelFromText(becomesItemText);
    const hero = level.characters.find(character => character.id === 'hero');
    const becomesEvent = hero?.itinerary.find(event => event.type === ItineraryEventType.BECOMES_ITEM) as { startTime:number } | undefined;
    const beforeState = createGameState({ ...level, initialTime:becomesEvent!.startTime - 1 });
    const atState = createGameState({ ...level, initialTime:becomesEvent!.startTime });
    const beforeRoom = findRoom(beforeState.rooms, 'Hall');
    const atRoom = findRoom(atState.rooms, 'Hall');

    expect(becomesEvent).toBeDefined();
    expect(beforeRoom.items.map(item => item.id)).toEqual(['vase']);
    expect(Array.from(beforeState.unplacedItemsById.keys())).toEqual(['broken vase']);
    expect(atRoom.items.map(item => item.id)).toEqual(['broken vase']);
    expect(Array.from(atState.unplacedItemsById.keys())).toEqual(['vase']);
    expect(atRoom.items[0]?.position).toEqual(beforeRoom.items[0]?.position);
  });
});