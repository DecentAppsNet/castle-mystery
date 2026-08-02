// Follow test conventions from CONTRIBUTING.md when editing this file.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { clearSeed, setSeed } from '@/common/randUtil';
import { loadLevelFromText } from '@/levelLoading/levelUtil';
import { createGameState, findCharacter } from '../gameUtil';
import ItineraryEventType from '../types/itineraryEvents/ItineraryEventType';
import inventoryToLeftHandText from './fixtures/inventory-to-left-hand.md?raw';
import roomToHandThenInventoryText from './fixtures/room-to-hand-then-inventory.md?raw';

describe('hand item integration', () => {
  beforeEach(() => {
    setSeed(1);
  });

  afterEach(() => {
    clearSeed();
  });

  it.skip('moves a room item into the right hand for `takes ... in hand` and back into inventory for `takes ... into inventory`', () => {
    const level = loadLevelFromText(roomToHandThenInventoryText, 'room-to-hand-then-inventory.md');
    const hero = level.characters.find(character => character.id === 'hero');
    const takeEvents = hero?.itinerary.filter(event => event.type === ItineraryEventType.TAKE_ITEM) || [];
    const atHandState = createGameState({ ...level, initialTime:takeEvents[0]!.startTime });
    const atInventoryState = createGameState({ ...level, initialTime:takeEvents[1]!.startTime });
    const heroWithHandItem = findCharacter(atHandState, 'Hero');
    const heroWithInventoryItem = findCharacter(atInventoryState, 'Hero');

    expect(takeEvents).toHaveLength(2);
    expect(takeEvents[0]).toMatchObject({ itemId:'book', destination:'right-hand' });
    expect(takeEvents[1]).toMatchObject({ itemId:'book', destination:'inventory' });
    expect(heroWithHandItem.rightHandItem?.id).toBe('book');
    expect(heroWithHandItem.leftHandItem).toBeNull();
    expect(heroWithHandItem.items).toEqual([]);
    expect(atHandState.rooms[0].items.map(item => item.id)).not.toContain('book');
    expect(heroWithInventoryItem.rightHandItem).toBeNull();
    expect(heroWithInventoryItem.leftHandItem).toBeNull();
    expect(heroWithInventoryItem.items.map(item => item.id)).toEqual(['book']);
  });

  it.skip('moves an inventory item into the left hand without requiring a room pickup', () => {
    const level = loadLevelFromText(inventoryToLeftHandText, 'inventory-to-left-hand.md');
    const atLeftHandState = createGameState({ ...level, initialTime:5_000 });
    const hero = findCharacter(atLeftHandState, 'Hero');

    expect(hero.items).toEqual([]);
    expect(hero.leftHandItem?.id).toBe('book');
    expect(hero.rightHandItem).toBeNull();
  });
});