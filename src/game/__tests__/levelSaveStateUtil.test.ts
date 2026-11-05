import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadValidLevelForTest } from '@/levelLoading/__tests__/testLevelUtil';
import initialAppearanceText from '@/levelLoading/__tests__/fixtures/initial-appearance.md?raw';
import LevelSaveState from '@/persistence/types/LevelSaveState';
import ClozeBlank from '../conclusions/types/ClozeBlank';
import ClozePartType from '../conclusions/types/ClozePartType';
import { createGameState } from '../gameUtil';
import { createLevelSaveState, isLevelSaveStateCompatible } from '../levelSaveStateUtil';
import levelText from './fixtures/save-state.md?raw';

function _createState() {
  return createGameState(loadValidLevelForTest(levelText));
}

describe('levelSaveStateUtil', () => {
  describe('createLevelSaveState()', () => {
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

    it('captures unfinished answers in blank order, including unspecified answers', () => {
      const state = _createState();
      const conclusion = state.conclusions.find(conclusion => conclusion.id === 'mystery')!;
      const blanks = conclusion.parts.filter(part => part.type === ClozePartType.blank) as ClozeBlank[];
      expect(blanks).toHaveLength(2);
      blanks[1].playerAnswerIndex = 1;
      expect(createLevelSaveState(state).incompleteConclusionAnswerIndexesById.mystery).toEqual([-1, 1]);
    });

    it('records completed IDs without retaining their answer selections', () => {
      const state = _createState();
      state.conclusions.find(conclusion => conclusion.id === 'finding')!.isComplete = true;
      const save = createLevelSaveState(state);
      expect(save.completedConclusionIds).toEqual(['finding']);
      expect(save.incompleteConclusionAnswerIndexesById).not.toHaveProperty('finding');
      expect(save.incompleteConclusionAnswerIndexesById).toHaveProperty('mystery');
    });

    it('keeps arrays and answers independent of later state changes', () => {
      const state = _createState();
      const save = createLevelSaveState(state);
      state.discoveryState.discoveredRoomIds.clear();
      state.discoveryState.discoveredItemIds.add('key');
      state.discoveryState.discoveredSkinIds.add('sam-default');
      state.discoveryState.titleKnownCharacterIds.add('sam');
      const conclusion = state.conclusions.find(conclusion => conclusion.id === 'mystery')!;
      (conclusion.parts.find(part => part.type === ClozePartType.blank) as ClozeBlank).playerAnswerIndex = 1;
      conclusion.isComplete = true;
      expect(save.discoveredRoomIds).toEqual(['hall']);
      expect(save.discoveredItemIds).toEqual([]);
      expect(save.discoveredSkinIds).toEqual([]);
      expect(save.titleKnownCharacterIds).toEqual([]);
      expect(save.completedConclusionIds).toEqual([]);
      expect(save.incompleteConclusionAnswerIndexesById.mystery).toEqual([-1, -1]);
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

    it('accepts authored member IDs and valid unfinished answers', () => {
      const state = _createState();
      const save:LevelSaveState = { ...createLevelSaveState(state), discoveredItemIds:['key'],
        discoveredSkinIds:['sam-disguise'], titleKnownCharacterIds:['sam'],
        completedConclusionIds:['finding'], incompleteConclusionAnswerIndexesById:{ mystery:[-1, 1] } };
      expect(isLevelSaveStateCompatible(save, state)).toBe(true);
    });

    it('allows absent answer entries to retain authored defaults', () => {
      const state = _createState();
      expect(isLevelSaveStateCompatible({ ...createLevelSaveState(state),
        incompleteConclusionAnswerIndexesById:{} }, state)).toBe(true);
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

    it('rejects an unknown skin', () => {
      const state = _createState();
      expect(isLevelSaveStateCompatible({ ...createLevelSaveState(state), discoveredSkinIds:['sam-missing'] }, state)).toBe(false);
      expect(console.error).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('discoveredSkinIds references unknown ID "sam-missing"'));
    });

    it('rejects a skin attributed to the wrong character', () => {
      const state = createGameState(loadValidLevelForTest(initialAppearanceText));
      expect(isLevelSaveStateCompatible({ ...createLevelSaveState(state), discoveredSkinIds:['visitor-detective'] }, state)).toBe(false);
    });

    it('rejects an unknown completed conclusion', () => {
      const state = _createState();
      expect(isLevelSaveStateCompatible({ ...createLevelSaveState(state), completedConclusionIds:['missing'] }, state)).toBe(false);
      expect(console.error).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('completedConclusionIds references unknown ID "missing"'));
    });

    it('rejects answers for an unknown conclusion', () => {
      const state = _createState();
      expect(isLevelSaveStateCompatible({ ...createLevelSaveState(state),
        incompleteConclusionAnswerIndexesById:{ missing:[] } }, state)).toBe(false);
      expect(console.error).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('unknown conclusion "missing"'));
    });

    it('rejects answers also marked completed in the save', () => {
      const state = _createState();
      expect(isLevelSaveStateCompatible({ ...createLevelSaveState(state), completedConclusionIds:['mystery'] }, state)).toBe(false);
      expect(console.error).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('"mystery" has unfinished answers but is also marked completed'));
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

    it('rejects a changed blank count', () => {
      const state = _createState();
      expect(isLevelSaveStateCompatible({ ...createLevelSaveState(state),
        incompleteConclusionAnswerIndexesById:{ mystery:[0] } }, state)).toBe(false);
      expect(console.error).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('"mystery" has 1 saved answers; expected 2 blanks'));
    });

    it('rejects an answer past the authored choices', () => {
      const state = _createState();
      expect(isLevelSaveStateCompatible({ ...createLevelSaveState(state),
        incompleteConclusionAnswerIndexesById:{ mystery:[0, 2] } }, state)).toBe(false);
      expect(console.error).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('"mystery", blank 2: answer index 2 is outside [0, 2)'));
    });

    it('rejects negative integers other than unspecified answers', () => {
      const state = _createState();
      expect(isLevelSaveStateCompatible({ ...createLevelSaveState(state),
        incompleteConclusionAnswerIndexesById:{ mystery:[-2, 0] } }, state)).toBe(false);
      expect(console.error).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('"mystery", blank 1: answer index -2 is outside [0, 2)'));
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