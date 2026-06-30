// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import becomesItemLocationsText from './fixtures/becomes-item-locations.md?raw';
import { loadLevelFromText } from '@/levelLoading/levelUtil';
import { createGameState } from '../gameUtil';
import { rebuildDynamicStateForTime } from '../dynamicStateRebuildUtil';
import ItineraryEventType from '../types/itineraryEvents/ItineraryEventType';
import { findRoom } from '../roomUtil';

describe('dynamicStateRebuildUtil.ts', () => {
  describe('rebuildDynamicStateForTime()', () => {
    it('replaces an item while it is in character inventory', () => {
      const gameState = _createGameStateBeforeReplacements();

      rebuildDynamicStateForTime(gameState, _findBecomesEventTime('inventory note'), 0, 0);

      const hero = gameState.characters.find(character => character.id === 'hero');
      expect(hero?.items.map(item => item.id)).toEqual(['left pebble', 'right twig', 'letter']);
      expect(hero?.leftHandItem).toBeNull();
      expect(hero?.rightHandItem).toBeNull();
      expect(Array.from(gameState.unplacedItemsById.keys())).toContain('inventory note');
      expect(Array.from(gameState.unplacedItemsById.keys())).not.toContain('letter');
    });

    it('replaces an item while it is in the left hand', () => {
      const gameState = _createGameStateBeforeReplacements();

      rebuildDynamicStateForTime(gameState, _findBecomesEventTime('left pebble'), 0, 0);

      const hero = gameState.characters.find(character => character.id === 'hero');
      expect(hero?.leftHandItem?.id).toBe('stone');
      expect(hero?.items.map(item => item.id)).toEqual(['right twig', 'letter']);
      expect(hero?.rightHandItem).toBeNull();
      expect(Array.from(gameState.unplacedItemsById.keys())).toContain('left pebble');
      expect(Array.from(gameState.unplacedItemsById.keys())).not.toContain('stone');
    });

    it('replaces an item while it is in the right hand', () => {
      const gameState = _createGameStateBeforeReplacements();

      rebuildDynamicStateForTime(gameState, _findBecomesEventTime('right twig'), 0, 0);

      const hero = gameState.characters.find(character => character.id === 'hero');
      expect(hero?.rightHandItem?.id).toBe('wand');
      expect(hero?.leftHandItem?.id).toBe('stone');
      expect(hero?.items.map(item => item.id)).toEqual(['letter']);
      expect(Array.from(gameState.unplacedItemsById.keys())).toContain('right twig');
      expect(Array.from(gameState.unplacedItemsById.keys())).not.toContain('wand');
    });

    it('replaces an item while it is on the room floor', () => {
      const gameState = _createGameStateBeforeReplacements();

      rebuildDynamicStateForTime(gameState, _findBecomesEventTime('floor vase'), 0, 0);

      const hall = findRoom(gameState.rooms, 'Hall');
      expect(hall.items.map(item => item.id)).toEqual(['shards']);
      expect(Array.from(gameState.unplacedItemsById.keys())).toContain('floor vase');
      expect(Array.from(gameState.unplacedItemsById.keys())).not.toContain('shards');
    });
  });
});

const _level = loadLevelFromText(becomesItemLocationsText, 'becomes-item-locations.md');

function _createGameStateBeforeReplacements() {
  return createGameState({ ..._level, initialTime:0 });
}

function _findBecomesEventTime(sourceItemId:string):number {
  const hero = _level.characters.find(character => character.id === 'hero');
  const becomesEvent = hero?.itinerary.find(event => event.type === ItineraryEventType.BECOMES_ITEM
    && 'sourceItemId' in event
    && event.sourceItemId === sourceItemId) as { startTime:number } | undefined;
  if (!becomesEvent) throw new Error(`becomes event for ${sourceItemId} not found`);
  return becomesEvent.startTime;
}