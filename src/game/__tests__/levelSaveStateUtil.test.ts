import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadValidLevelForTest } from '@/levelLoading/__tests__/testLevelUtil';
import initialAppearanceText from '@/levelLoading/__tests__/fixtures/initial-appearance.md?raw';
import LevelSaveState from '@/persistence/types/LevelSaveState';
import { createGameState } from '../gameUtil';
import { createLevelSaveState, isLevelSaveStateCompatible } from '../levelSaveStateUtil';
import { completeLevel, revealRooms } from '../worldProgressUtil';
import discoveryStateLevelText from './fixtures/discovery-state.md?raw';
import levelText from './fixtures/save-state.md?raw';

function _createState() {
  return createGameState(loadValidLevelForTest(levelText));
}

describe('levelSaveStateUtil', () => {
  describe('createLevelSaveState()', () => {
    it('captures only rooms revealed relative to authored obscuration, even without a visit', () => {
      const state = createGameState(loadValidLevelForTest(discoveryStateLevelText));
      expect(createLevelSaveState(state).revealedRoomIds).toEqual([]);

      revealRooms(state, ['study', 'hall']);

      expect(createLevelSaveState(state)).toMatchObject({
        revealedRoomIds:['study'], discoveredRoomIds:['hall'], isLevelComplete:false
      });
    });

    it('captures completed-level mode and the rooms revealed by its sweep', () => {
      const state = createGameState(loadValidLevelForTest(discoveryStateLevelText));
      completeLevel(state);
      expect(createLevelSaveState(state)).toMatchObject({ revealedRoomIds:['study'], isLevelComplete:true });
    });
    it('captures the authoritative discovery sets and active character', () => {
      const state = _createState();
      state.discoveryState.discoveredRoomIds.add('hall');
      state.discoveryState.discoveredItemIds.add('key');
      state.discoveryState.discoveredSkinIds.add('sam-disguise');
      state.discoveryState.titleKnownCharacterIds.add('sam');
      expect(createLevelSaveState(state)).toMatchObject({
        activeCharacterId:'sam', discoveredRoomIds:['hall'], discoveredItemIds:['key'],
        discoveredSkinIds:['sam-disguise'], titleKnownCharacterIds:['sam']
      });
    });

    it('omits conclusion fields from the save', () => {
      const state = _createState();
      state.conclusions.find(conclusion => conclusion.id === 'finding')!.isComplete = true;
      const save = createLevelSaveState(state);
      expect(save).not.toHaveProperty('completedConclusionIds');
      expect(save).not.toHaveProperty('incompleteConclusionAnswerIndexesById');
    });

    it('keeps discovery arrays independent of later state changes', () => {
      const state = _createState();
      const save = createLevelSaveState(state);
      state.discoveryState.discoveredRoomIds.clear();
      state.discoveryState.discoveredItemIds.add('key');
      state.discoveryState.discoveredSkinIds.add('sam-default');
      state.discoveryState.titleKnownCharacterIds.add('sam');
      expect(save.discoveredRoomIds).toEqual(['hall']);
      expect(save.discoveredItemIds).toEqual([]);
      expect(save.discoveredSkinIds).toEqual([]);
      expect(save.titleKnownCharacterIds).toEqual([]);
    });

    it('uses the supplied committed coordinate instead of live time', () => {
      const state = _createState();
      const committedTime = state.timeline.startTime;
      state.time = state.timeline.endTime;
      expect(createLevelSaveState(state, committedTime).time).toBe(25 * 60 * 60 * 1000);
      expect(createLevelSaveState(state).time).toBe(state.timeline.endTime);
    });
  });

  describe('isLevelSaveStateCompatible()', () => {
    beforeEach(() => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => vi.restoreAllMocks());

    it('accepts fresh snapshots at both inclusive extended-hour timeline bounds', () => {
      const state = _createState();
      expect(isLevelSaveStateCompatible(createLevelSaveState(state, state.timeline.startTime), state)).toBe(true);
      expect(isLevelSaveStateCompatible(createLevelSaveState(state, state.timeline.endTime), state)).toBe(true);
      expect(console.error).not.toHaveBeenCalled();
    });

    it('accepts defaults and named skins even when neither is the initial selected appearance', () => {
      const state = createGameState(loadValidLevelForTest(initialAppearanceText));
      const save = { ...createLevelSaveState(state),
        discoveredSkinIds:['sam-default', 'sam-detective', 'sam-witness'] };
      expect(isLevelSaveStateCompatible(save, state)).toBe(true);
    });

    it('accepts authored world member IDs', () => {
      const state = _createState();
      const save:LevelSaveState = { ...createLevelSaveState(state), discoveredItemIds:['key'],
        discoveredSkinIds:['sam-disguise'], titleKnownCharacterIds:['sam'] };
      expect(isLevelSaveStateCompatible(save, state)).toBe(true);
    });

    it('rejects an unknown active character', () => {
      const state = _createState();
      expect(isLevelSaveStateCompatible({ ...createLevelSaveState(state), activeCharacterId:'missing' }, state)).toBe(false);
      expect(console.error).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('activeCharacterId references unknown ID "missing"'));
    });

    it('rejects an unknown known-title character', () => {
      const state = _createState();
      expect(isLevelSaveStateCompatible({ ...createLevelSaveState(state), titleKnownCharacterIds:['missing'] }, state)).toBe(false);
      expect(console.error).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('titleKnownCharacterIds references unknown ID "missing"'));
    });

    it('rejects an unknown room', () => {
      const state = _createState();
      expect(isLevelSaveStateCompatible({ ...createLevelSaveState(state), discoveredRoomIds:['missing'] }, state)).toBe(false);
      expect(console.error).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('discoveredRoomIds references unknown ID "missing"'));
    });

    it('rejects an unknown item', () => {
      const state = _createState();
      expect(isLevelSaveStateCompatible({ ...createLevelSaveState(state), discoveredItemIds:['missing'] }, state)).toBe(false);
      expect(console.error).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('discoveredItemIds references unknown ID "missing"'));
    });

    it('rejects an unknown revealed room', () => {
      const state = _createState();
      expect(isLevelSaveStateCompatible({ ...createLevelSaveState(state), revealedRoomIds:['missing'] }, state)).toBe(false);
      expect(console.error).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('revealedRoomIds references unknown ID "missing"'));
    });

    it('rejects an unknown skin', () => {
      const state = _createState();
      expect(isLevelSaveStateCompatible({ ...createLevelSaveState(state), discoveredSkinIds:['sam-missing'] }, state)).toBe(false);
      expect(console.error).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('discoveredSkinIds references unknown ID "sam-missing"'));
    });

    it('rejects a skin attributed to the wrong character', () => {
      const state = createGameState(loadValidLevelForTest(initialAppearanceText));
      expect(isLevelSaveStateCompatible({ ...createLevelSaveState(state), discoveredSkinIds:['visitor-detective'] }, state)).toBe(false);
    });

    it('rejects time before the timeline starts', () => {
      const state = _createState();
      expect(isLevelSaveStateCompatible(createLevelSaveState(state, state.timeline.startTime - 1), state)).toBe(false);
      expect(console.error).toHaveBeenCalledExactlyOnceWith(expect.stringContaining(
        `time ${state.timeline.startTime - 1} is outside timeline bounds [${state.timeline.startTime}, ${state.timeline.endTime}]`));
    });

    it('rejects time after the timeline ends', () => {
      const state = _createState();
      expect(isLevelSaveStateCompatible(createLevelSaveState(state, state.timeline.endTime + 1), state)).toBe(false);
      expect(console.error).toHaveBeenCalledExactlyOnceWith(expect.stringContaining(
        `time ${state.timeline.endTime + 1} is outside timeline bounds [${state.timeline.startTime}, ${state.timeline.endTime}]`));
    });

    it('does not mutate progress while rejecting an incompatible record', () => {
      const state = _createState();
      const before = createLevelSaveState(state);
      const save = { ...before, discoveredRoomIds:['missing'] };
      expect(isLevelSaveStateCompatible(save, state)).toBe(false);
      expect(createLevelSaveState(state)).toEqual(before);
      expect(save.discoveredRoomIds).toEqual(['missing']);
    });
  });
});