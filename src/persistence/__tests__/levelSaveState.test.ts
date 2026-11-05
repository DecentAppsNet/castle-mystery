import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearLevelSaveState, getLevelSaveState, setLevelSaveState } from '../levelSaveState';
import LevelSaveState from '../types/LevelSaveState';
import { pathStoreMock } from './pathStoreMock';

vi.mock('../pathStore', async () => {
  const { pathStoreMock } = await import('./pathStoreMock');
  return pathStoreMock;
});

const levelFilename = 'castle/first.md';
const saveKey = '/levelSaves/$castle/first.md.json';
const saveState:LevelSaveState = {
  time:90000000,
  activeCharacterId:'duchess',
  discoveredRoomIds:['hall'],
  discoveredItemIds:['key'],
  discoveredSkinIds:['duchess-disguise'],
  titleKnownCharacterIds:['duchess'],
  completedConclusionIds:['identity'],
  incompleteConclusionAnswerIndexesById:{ mystery:[-1, 0, 2] }
};

async function _expectDiscarded(value:unknown) {
  pathStoreMock.values[saveKey] = JSON.stringify(value);
  await expect(getLevelSaveState(levelFilename)).resolves.toBeNull();
  expect(pathStoreMock.deleteByKey).toHaveBeenCalledExactlyOnceWith(saveKey);
  expect(pathStoreMock.values[saveKey]).toBeUndefined();
}

describe('levelSaveState', () => {
  beforeEach(() => pathStoreMock.reset());

  describe('getLevelSaveState()', () => {
    it('returns null for a missing key without deleting anything', async () => {
      await expect(getLevelSaveState(levelFilename)).resolves.toBeNull();
      expect(pathStoreMock.getText).toHaveBeenCalledExactlyOnceWith(saveKey);
      expect(pathStoreMock.deleteByKey).not.toHaveBeenCalled();
    });

    it('round-trips every field, including extended-hour time and unspecified answers', async () => {
      await setLevelSaveState(levelFilename, saveState);
      const restored = await getLevelSaveState(levelFilename);
      expect(restored).toEqual(saveState);
      expect(restored).not.toBe(saveState);
      expect(pathStoreMock.deleteByKey).not.toHaveBeenCalled();
    });

    it('accepts empty discovery arrays and unfinished-answer lookups', async () => {
      const emptySave = { ...saveState, discoveredRoomIds:[], discoveredItemIds:[],
        discoveredSkinIds:[], titleKnownCharacterIds:[], completedConclusionIds:[],
        incompleteConclusionAnswerIndexesById:{} };
      await setLevelSaveState(levelFilename, emptySave);
      await expect(getLevelSaveState(levelFilename)).resolves.toEqual(emptySave);
    });

    it('deletes malformed JSON and treats the next read as absent', async () => {
      pathStoreMock.values[saveKey] = '{';
      await expect(getLevelSaveState(levelFilename)).resolves.toBeNull();
      await expect(getLevelSaveState(levelFilename)).resolves.toBeNull();
      expect(pathStoreMock.deleteByKey).toHaveBeenCalledExactlyOnceWith(saveKey);
    });

    it('deletes empty text instead of treating it as a missing key', async () => {
      pathStoreMock.values[saveKey] = '';
      await expect(getLevelSaveState(levelFilename)).resolves.toBeNull();
      expect(pathStoreMock.deleteByKey).toHaveBeenCalledExactlyOnceWith(saveKey);
    });

    it('rejects JSON null', async () => {
      await _expectDiscarded(null);
    });

    it('rejects a top-level array', async () => {
      await _expectDiscarded([]);
    });

    it('rejects a top-level primitive', async () => {
      await _expectDiscarded('save');
    });

    it('rejects missing members', async () => {
      await _expectDiscarded({ ...saveState, completedConclusionIds:undefined });
    });

    it('rejects a non-string active character', async () => {
      await _expectDiscarded({ ...saveState, activeCharacterId:7 });
    });

    it('rejects a non-array discovery field', async () => {
      await _expectDiscarded({ ...saveState, discoveredRoomIds:'hall' });
    });

    it('rejects non-string item IDs', async () => {
      await _expectDiscarded({ ...saveState, discoveredItemIds:[1] });
    });

    it('rejects non-string skin IDs', async () => {
      await _expectDiscarded({ ...saveState, discoveredSkinIds:[null] });
    });

    it('rejects non-string known-title IDs', async () => {
      await _expectDiscarded({ ...saveState, titleKnownCharacterIds:[false] });
    });

    it('rejects non-string completed-conclusion IDs', async () => {
      await _expectDiscarded({ ...saveState, completedConclusionIds:[{}] });
    });

    it('rejects string time', async () => {
      await _expectDiscarded({ ...saveState, time:'90000000' });
    });

    it('rejects null time', async () => {
      await _expectDiscarded({ ...saveState, time:null });
    });

    it('rejects JSON numeric overflow as nonfinite time', async () => {
      pathStoreMock.values[saveKey] = JSON.stringify(saveState).replace('90000000', '1e400');
      await expect(getLevelSaveState(levelFilename)).resolves.toBeNull();
      expect(pathStoreMock.deleteByKey).toHaveBeenCalledExactlyOnceWith(saveKey);
    });

    it('rejects a null unfinished-answer lookup', async () => {
      await _expectDiscarded({ ...saveState, incompleteConclusionAnswerIndexesById:null });
    });

    it('rejects an array unfinished-answer lookup', async () => {
      await _expectDiscarded({ ...saveState, incompleteConclusionAnswerIndexesById:[] });
    });

    it('rejects a non-array answer entry', async () => {
      await _expectDiscarded({ ...saveState, incompleteConclusionAnswerIndexesById:{ mystery:0 } });
    });

    it('rejects string answer indexes', async () => {
      await _expectDiscarded({ ...saveState, incompleteConclusionAnswerIndexesById:{ mystery:['0'] } });
    });

    it('rejects fractional answer indexes', async () => {
      await _expectDiscarded({ ...saveState, incompleteConclusionAnswerIndexesById:{ mystery:[0.5] } });
    });

    it('leaves integer answer-range validation to the caller', async () => {
      const save = { ...saveState, incompleteConclusionAnswerIndexesById:{ mystery:[-2] } };
      await setLevelSaveState(levelFilename, save);
      await expect(getLevelSaveState(levelFilename)).resolves.toEqual(save);
      expect(pathStoreMock.deleteByKey).not.toHaveBeenCalled();
    });

    it('rejects nonfinite answers serialized as null', async () => {
      await _expectDiscarded({ ...saveState, incompleteConclusionAnswerIndexesById:{ mystery:[NaN] } });
    });

    it('propagates storage read failures without treating them as corruption', async () => {
      pathStoreMock.getText.mockRejectedValueOnce(new Error('Read failed'));
      await expect(getLevelSaveState(levelFilename)).rejects.toThrow('Read failed');
      expect(pathStoreMock.deleteByKey).not.toHaveBeenCalled();
    });

    it('propagates failed corruption cleanup', async () => {
      pathStoreMock.values[saveKey] = '{';
      pathStoreMock.deleteByKey.mockRejectedValueOnce(new Error('Delete failed'));
      await expect(getLevelSaveState(levelFilename)).rejects.toThrow('Delete failed');
      expect(pathStoreMock.values[saveKey]).toBe('{');
    });
  });

  describe('setLevelSaveState()', () => {
    it('keeps same-named levels in different directories independent', async () => {
      const otherSave = { ...saveState, time:90000001 };
      await setLevelSaveState(levelFilename, saveState);
      await setLevelSaveState('tower/first.md', otherSave);
      await expect(getLevelSaveState(levelFilename)).resolves.toEqual(saveState);
      await expect(getLevelSaveState('tower/first.md')).resolves.toEqual(otherSave);
    });

    it('propagates write failures', async () => {
      pathStoreMock.setText.mockRejectedValueOnce(new Error('Write failed'));
      await expect(setLevelSaveState(levelFilename, saveState)).rejects.toThrow('Write failed');
    });
  });

  describe('clearLevelSaveState()', () => {
    it('clears only the requested level', async () => {
      await setLevelSaveState(levelFilename, saveState);
      await setLevelSaveState('tower/first.md', saveState);
      await clearLevelSaveState(levelFilename);
      await expect(getLevelSaveState(levelFilename)).resolves.toBeNull();
      await expect(getLevelSaveState('tower/first.md')).resolves.toEqual(saveState);
    });

    it('allows clearing a missing record', async () => {
      await expect(clearLevelSaveState(levelFilename)).resolves.toBeUndefined();
      expect(pathStoreMock.deleteByKey).toHaveBeenCalledExactlyOnceWith(saveKey);
    });
  });
});