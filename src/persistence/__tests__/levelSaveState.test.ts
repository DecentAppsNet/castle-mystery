import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearLevelSaveState, getLevelSaveState, setLevelSaveState } from '../levelSaveState';
import LevelSaveState from '../types/LevelSaveState';
import { pathStoreMock } from './pathStoreMock';

vi.mock('../pathStore', async () => {
  const { pathStoreMock } = await import('./pathStoreMock');
  return pathStoreMock;
});

const levelFilename = 'first.md';
const saveKey = '/levelSaves/$first.md.json';
const saveState:LevelSaveState = {
  time:90000000,
  activeCharacterId:'duchess',
  discoveredRoomIds:['hall'],
  revealedRoomIds:['study'],
  discoveredItemIds:['key'],
  discoveredSkinIds:['duchess-disguise'],
  titleKnownCharacterIds:['duchess'],
  isLevelComplete:true
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

    it('round-trips every world field, including extended-hour time', async () => {
      await setLevelSaveState(levelFilename, saveState);
      const restored = await getLevelSaveState(levelFilename);
      expect(restored).toEqual(saveState);
      expect(restored).not.toBe(saveState);
      expect(pathStoreMock.deleteByKey).not.toHaveBeenCalled();
    });

    it('accepts empty discovery arrays', async () => {
      const emptySave = { ...saveState, discoveredRoomIds:[], revealedRoomIds:[], discoveredItemIds:[],
        isLevelComplete:false,
        discoveredSkinIds:[], titleKnownCharacterIds:[] };
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
      await _expectDiscarded({ ...saveState, titleKnownCharacterIds:undefined });
    });

    it('deletes an old save without explicit world progress', async () => {
      await _expectDiscarded({ ...saveState, revealedRoomIds:undefined, isLevelComplete:undefined,
        completedConclusionIds:['identity'], incompleteConclusionAnswerIndexesById:{} });
    });

    it('requires revealed room IDs even when the completion flag is present', async () => {
      await _expectDiscarded({ ...saveState, revealedRoomIds:undefined });
    });

    it('rejects non-string revealed room IDs', async () => {
      await _expectDiscarded({ ...saveState, revealedRoomIds:[1] });
    });

    it('requires a boolean completion flag', async () => {
      await _expectDiscarded({ ...saveState, isLevelComplete:'true' });
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

    it('accepts a current save without validating extra members', async () => {
      pathStoreMock.values[saveKey] = JSON.stringify({ ...saveState, completedConclusionIds:null,
        incompleteConclusionAnswerIndexesById:'unused', extra:42 });
      await expect(getLevelSaveState(levelFilename)).resolves.toMatchObject(saveState);
      expect(pathStoreMock.deleteByKey).not.toHaveBeenCalled();
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
    it('keeps distinct level filenames independent', async () => {
      const otherSave = { ...saveState, time:90000001 };
      await setLevelSaveState(levelFilename, saveState);
      await setLevelSaveState('second.md', otherSave);
      await expect(getLevelSaveState(levelFilename)).resolves.toEqual(saveState);
      await expect(getLevelSaveState('second.md')).resolves.toEqual(otherSave);
    });

    it('propagates write failures', async () => {
      pathStoreMock.setText.mockRejectedValueOnce(new Error('Write failed'));
      await expect(setLevelSaveState(levelFilename, saveState)).rejects.toThrow('Write failed');
    });
  });

  describe('clearLevelSaveState()', () => {
    it('clears only the requested level', async () => {
      await setLevelSaveState(levelFilename, saveState);
      await setLevelSaveState('second.md', saveState);
      await clearLevelSaveState(levelFilename);
      await expect(getLevelSaveState(levelFilename)).resolves.toBeNull();
      await expect(getLevelSaveState('second.md')).resolves.toEqual(saveState);
    });

    it('allows clearing a missing record', async () => {
      await expect(clearLevelSaveState(levelFilename)).resolves.toBeUndefined();
      expect(pathStoreMock.deleteByKey).toHaveBeenCalledExactlyOnceWith(saveKey);
    });
  });
});