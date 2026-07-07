// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import { loadLevelFromText } from '@/levelLoading/levelUtil';
import ItineraryEventType from '../types/itineraryEvents/ItineraryEventType';
import { createGameState } from '../gameUtil';
import { rebuildDynamicStateForTime } from '../dynamicStateRebuildUtil';
import { findRoom } from '../roomUtil';
import becomesItemText from './fixtures/becomes-item.md?raw';

describe('becomes item integration', () => {
  it('replaces an owned item with its declared unplaced target and supports a later reverse replacement', () => {
    const level = loadLevelFromText(becomesItemText.replace(
      '0:00:05 Vase becomes Broken Vase',
      '0:00:04 hide Vase\n0:00:05 Vase becomes Broken Vase'));
    const hero = level.characters.find(character => character.id === 'hero');
    const becomesEvents = hero?.itinerary.filter(event => event.type === ItineraryEventType.BECOMES_ITEM) as { startTime:number }[] | undefined;
    const firstEvent = becomesEvents?.[0];
    const secondEvent = becomesEvents?.[1];
    const beforeState = createGameState({ ...level, initialTime:firstEvent!.startTime - 1 });
    const afterFirstState = createGameState({ ...level, initialTime:firstEvent!.startTime });
    const afterSecondState = createGameState({ ...level, initialTime:secondEvent!.startTime });
    const beforeRoom = findRoom(beforeState.rooms, 'Hall')!;
    const afterFirstRoom = findRoom(afterFirstState.rooms, 'Hall')!;
    const afterSecondRoom = findRoom(afterSecondState.rooms, 'Hall')!;
    const beforeHero = beforeState.characters.find(character => character.id === 'hero');
    const afterFirstHero = afterFirstState.characters.find(character => character.id === 'hero');
    const afterSecondHero = afterSecondState.characters.find(character => character.id === 'hero');

    expect(becomesEvents).toHaveLength(2);
    expect(beforeRoom.items.map(item => item.id)).toEqual([]);
    expect(beforeHero?.items.map(item => item.id)).toEqual(['vase']);
    expect(Array.from(beforeState.unplacedItemsById.keys())).toEqual(['broken vase']);
    expect(afterFirstRoom.items.map(item => item.id)).toEqual([]);
    expect(afterFirstHero?.items.map(item => item.id)).toEqual(['broken vase']);
    expect(Array.from(afterFirstState.unplacedItemsById.keys())).toEqual(['vase']);

    const unplacedVase = afterFirstState.unplacedItemsById.get('vase');
    expect(unplacedVase).toBeDefined();
    if (!unplacedVase) expect.fail('expected vase to be unplaced after the first replacement');
    expect(unplacedVase.isVisible).toBe(false);
    unplacedVase.isDiscovered = true;
    rebuildDynamicStateForTime(afterFirstState, secondEvent!.startTime, afterFirstState.time, 0);

    const afterRebuildHero = afterFirstState.characters.find(character => character.id === 'hero');
    expect(afterRebuildHero?.items.map(item => item.id)).toEqual(['vase']);
    expect(afterRebuildHero?.items[0]?.isVisible).toBe(false);
    expect(afterRebuildHero?.items[0]?.isDiscovered).toBe(true);

    expect(afterSecondRoom.items.map(item => item.id)).toEqual([]);
    expect(afterSecondHero?.items.map(item => item.id)).toEqual(['vase']);
    expect(Array.from(afterSecondState.unplacedItemsById.keys())).toEqual(['broken vase']);
  });
});