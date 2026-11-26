import { describe, expect, it } from 'vitest';
import { loadValidLevelForTest } from '@/levelLoading/__tests__/testLevelUtil';
import { createGameState } from '../gameUtil';
import { createLevelSaveState, restoreGameStateFromSave } from '../levelSaveStateUtil';
import { completeLevel, revealRooms } from '../worldProgressUtil';
import discoveryText from './fixtures/discovery-state.md?raw';

describe('restoreGameStateFromSave()', () => {
  it('merges saved discoveries without removing authored known titles or initial rooms', () => {
    const state = createGameState(loadValidLevelForTest(discoveryText));
    const save = { ...createLevelSaveState(state), discoveredRoomIds:['study'],
      discoveredItemIds:['brass key'], discoveredSkinIds:['pat-default'], titleKnownCharacterIds:['pat'] };
    restoreGameStateFromSave(state, save);
    expect(state.discoveryState.discoveredRoomIds).toEqual(new Set(['hall', 'study']));
    expect(state.discoveryState.titleKnownCharacterIds).toEqual(new Set(['sam', 'pat']));
    expect(state.discoveryState.discoveredItemIds).toEqual(new Set(['brass key']));
    expect(state.discoveryState.discoveredSkinIds).toEqual(new Set(['pat-default']));
    expect(state.discoveryState.obscuredRoomIds).toEqual(new Set(['study']));
  });

  it('round-trips an explicit reveal and its skin linkages without marking the room visited', () => {
    const level = loadValidLevelForTest(discoveryText);
    const played = createGameState(level);
    revealRooms(played, ['study']);
    const save = createLevelSaveState(played);
    const restored = createGameState(level);

    expect(save.revealedRoomIds).toEqual(['study']);
    restoreGameStateFromSave(restored, save);
    expect(restored.discoveryState.obscuredRoomIds).not.toContain('study');
    expect(restored.discoveryState.discoveredRoomIds).not.toContain('study');
    expect(restored.discoveryState.revealedSkinLinkages).toEqual(played.discoveryState.revealedSkinLinkages);
    expect(createLevelSaveState(restored)).toEqual(save);
    expect(level.discoveryConfig.initiallyObscuredRoomIds).toEqual(new Set(['study']));
  });

  it('round-trips completed world progress without changing fresh conclusions', () => {
    const level = loadValidLevelForTest(discoveryText);
    const played = createGameState(level);
    completeLevel(played);
    const save = createLevelSaveState(played);
    const originalSave = JSON.stringify(save);
    const restored = createGameState(level);
    const originalConclusions = JSON.stringify(restored.conclusions);

    restoreGameStateFromSave(restored, save);
    restoreGameStateFromSave(restored, save);
    expect(restored.isLevelComplete).toBe(true);
    expect(createLevelSaveState(restored)).toEqual(save);
    expect(JSON.stringify(restored.conclusions)).toBe(originalConclusions);
    expect(JSON.stringify(save)).toBe(originalSave);
    expect(restored.metaTimeEffects).toEqual([]);
    expect(restored.characterMetaTimeEffectsByCharacterId.size).toBe(0);
  });

  it('restores completed mode without sweeping discoveries or revealing unsaved rooms and titles', () => {
    const state = createGameState(loadValidLevelForTest(discoveryText));
    const save = { ...createLevelSaveState(state), isLevelComplete:true };

    restoreGameStateFromSave(state, save);
    expect(state.isLevelComplete).toBe(true);
    expect(createLevelSaveState(state)).toEqual(save);
    expect(state.discoveryState.obscuredRoomIds).toContain('study');
    expect(state.isPlaying).toBe(false);
  });
});