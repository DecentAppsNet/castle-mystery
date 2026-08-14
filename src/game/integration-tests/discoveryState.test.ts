import { describe, expect, it } from 'vitest';

import { updateGameStateForChangeConclusions } from '@/game/conclusionStateUtil';
import { createDiscoveries, markCharacterDiscovered, markItemDiscovered } from '@/game/discoveriesUtil';
import { createGameState } from '@/game/gameUtil';
import { createTimelineSnapshot } from '@/game/timeline';
import PlayerEventType from '@/game/types/playerEvents/PlayerEventType';
import { loadValidLevelForTest } from '@/levelLoading/__tests__/testLevelUtil';
import discoveryStateLevelText from './fixtures/discovery-state.md?raw';

function _loadLevel() {
  return loadValidLevelForTest(discoveryStateLevelText, 'discovery-state.md');
}

function _createGameState() {
  return createGameState(_loadLevel());
}

describe('discovery state integration', () => {
  it('initializes independent discovery state from authored level values and discovers the active room', () => {
    const level = _loadLevel();
    const gameState1 = createGameState(level);
    const gameState2 = createGameState(level);

    expect(level.discoveryConfig.initiallyKnownTitleCharacterIds).toEqual(new Set(['sam']));
    expect(level.discoveryConfig.initiallyObscuredRoomIds).toEqual(new Set(['study']));
    expect(gameState1.discoveryState.discoveredCharacterIds).toEqual(new Set());
    expect(gameState1.discoveryState.discoveredItemIds).toEqual(new Set());
    expect(gameState1.discoveryState.discoveredRoomIds).toEqual(new Set(['hall']));
    expect(gameState1.discoveryState.titleKnownCharacterIds).toEqual(new Set(['sam']));
    expect(gameState1.discoveryState.obscuredRoomIds).toEqual(new Set(['study']));
    expect(gameState1.discoveryState).not.toBe(gameState2.discoveryState);
    expect(gameState1.discoveryState.discoveredRoomIds).not.toBe(gameState2.discoveryState.discoveredRoomIds);
    gameState1.discoveryState.titleKnownCharacterIds.add('pat');
    gameState1.discoveryState.obscuredRoomIds.delete('study');
    expect(level.discoveryConfig.initiallyKnownTitleCharacterIds).toEqual(new Set(['sam']));
    expect(level.discoveryConfig.initiallyObscuredRoomIds).toEqual(new Set(['study']));
    expect(gameState2.discoveryState.titleKnownCharacterIds).toEqual(new Set(['sam']));
    expect(gameState2.discoveryState.obscuredRoomIds).toEqual(new Set(['study']));
  });

  it('records item and character discovery in insertion order without mutating world-object flags', () => {
    const gameState = _createGameState();
    const pat = gameState.baseCharacters.find(character => character.id === 'pat')!;
    const brassKey = gameState.baseItemsById.get('brass key')!;

    markItemDiscovered(gameState, brassKey);
    markCharacterDiscovered(gameState, pat);

    expect(gameState.discoveryState.discoveredItemIds).toEqual(new Set(['brass key']));
    expect(gameState.discoveryState.discoveredCharacterIds).toEqual(new Set(['pat']));
    expect(brassKey).not.toHaveProperty('isDiscovered');
    expect(pat).not.toHaveProperty('isDiscovered');
    expect(createDiscoveries(gameState)).toMatchObject({
      discoveredItemIconUrls:['/assets/items/brass-key.png'],
      discoveredCharacterIconUrls:[''],
      discoveredRoomCount:1
    });
  });

  it('preserves discovery state when replacing the timeline snapshot', () => {
    const gameState = _createGameState();
    const discoveryState = gameState.discoveryState;
    gameState.discoveryState.discoveredCharacterIds.add('pat');
    gameState.discoveryState.discoveredItemIds.add('brass key');
    gameState.discoveryState.discoveredRoomIds.add('study');
    gameState.discoveryState.titleKnownCharacterIds.add('pat');
    gameState.discoveryState.obscuredRoomIds.delete('study');

    gameState.timelineSnapshot = createTimelineSnapshot(gameState, gameState.startTime);

    expect(gameState.discoveryState).toBe(discoveryState);
    expect(gameState.discoveryState.discoveredCharacterIds).toEqual(new Set(['pat']));
    expect(gameState.discoveryState.discoveredItemIds).toEqual(new Set(['brass key']));
    expect(gameState.discoveryState.discoveredRoomIds).toEqual(new Set(['hall', 'study']));
    expect(gameState.discoveryState.titleKnownCharacterIds).toEqual(new Set(['sam', 'pat']));
    expect(gameState.discoveryState.obscuredRoomIds).toEqual(new Set());
  });

  it('applies conclusion room reveals, identity title reveals, and level-complete discovery only to discovery state', () => {
    const gameState = _createGameState();
    const discoveryConclusion = gameState.conclusions.find(conclusion => conclusion.id === 'discovery')!;
    const identitiesConclusion = gameState.conclusions.find(conclusion => conclusion.id === 'identities')!;

    updateGameStateForChangeConclusions(gameState, {
      type:PlayerEventType.CHANGE_CONCLUSIONS,
      conclusions:gameState.conclusions.map(conclusion => ({
        ...conclusion,
        isComplete:conclusion.id === discoveryConclusion.id
      }))
    });

    expect(gameState.discoveryState.obscuredRoomIds).not.toContain('study');
    expect(gameState.baseRooms.find(room => room.id === 'study')).not.toHaveProperty('isObscured');
    expect(gameState.isLevelComplete).toBe(false);

    updateGameStateForChangeConclusions(gameState, {
      type:PlayerEventType.CHANGE_CONCLUSIONS,
      conclusions:gameState.conclusions.map(conclusion => ({
        ...conclusion,
        isComplete:conclusion.id === identitiesConclusion.id || conclusion.id === discoveryConclusion.id
      }))
    });

    expect(gameState.discoveryState.titleKnownCharacterIds).toEqual(new Set(['sam', 'pat']));
    expect(gameState.discoveryState.discoveredCharacterIds).toEqual(new Set(['sam', 'pat']));
    expect(gameState.discoveryState.discoveredItemIds).toEqual(new Set(['brass key']));
    expect(gameState.discoveryState.discoveredRoomIds).toEqual(new Set(['hall', 'study']));
    expect(gameState.isLevelComplete).toBe(true);
    expect(gameState.baseCharacters.find(character => character.id === 'pat')).not.toHaveProperty('isTitleKnown');
    expect(gameState.baseRooms.every(room => !Object.hasOwn(room, 'isDiscovered'))).toBe(true);
  });
});
