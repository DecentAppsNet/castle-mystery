import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createGameState } from '@/game/gameUtil';
import { createEmptyImageSet } from '@/game/imageSetUtil';
import { createLevelSaveState } from '@/game/levelSaveStateUtil';
import saveText from '@/game/__tests__/fixtures/save-state.md?raw';
import discoveryText from '@/game/__tests__/fixtures/discovery-state.md?raw';
import { loadValidLevelForTest } from '@/levelLoading/__tests__/testLevelUtil';
import appearanceText from '@/levelLoading/__tests__/fixtures/initial-appearance.md?raw';
import defaultText from '@/levelLoading/__tests__/fixtures/default-level.md?raw';
import { setLevelSaveState, getLevelSaveState } from '@/persistence/levelSaveState';
import { pathStoreMock } from '@/persistence/__tests__/pathStoreMock';
import { prepareLevelState } from '../levelPreparation';

vi.mock('@/persistence/pathStore', async () => {
  const { pathStoreMock } = await import('@/persistence/__tests__/pathStoreMock');
  return pathStoreMock;
});

const levelUrl = 'castles/first.md';

describe('prepareLevelState()', () => {
  beforeEach(() => {
    pathStoreMock.reset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('keeps no-save defaults and supplied image assets and requests an initial save', async () => {
    const level = loadValidLevelForTest(defaultText);
    const imageSet = createEmptyImageSet();
    const prepared = await prepareLevelState(level, imageSet, levelUrl);
    expect(prepared.levelUrl).toBe(levelUrl);
    expect(prepared.needsInitialSave).toBe(true);
    expect(prepared.gameState.imageSet).toBe(imageSet);
    expect(prepared.gameState.time).toBe(level.initialTime);
    expect(prepared.gameState.isPlaying).toBe(false);
    expect(pathStoreMock.setText).not.toHaveBeenCalled();
  });

  it('aligns selected character, room and snapshot at a noninitial coordinate', async () => {
    const level = loadValidLevelForTest(defaultText);
    const save = createLevelSaveState(createGameState(level), level.timeline.endTime);
    await setLevelSaveState(levelUrl, save);
    const { gameState, needsInitialSave } = await prepareLevelState(level, createEmptyImageSet(), levelUrl);
    expect(needsInitialSave).toBe(false);
    expect(gameState.time).toBe(level.timeline.endTime);
    expect(gameState.activeCharacterId).toBe('sam');
    expect(gameState.timelineSnapshot.activeCharacter.id).toBe('sam');
    expect(gameState.timelineSnapshot.activeRoom.id).toBe('closet');
    expect(gameState.activeSkinIdAtSelection).toBe(gameState.timelineSnapshot.activeCharacter.skinId);
  });

  it('restores a different active character and its selection-dependent context', async () => {
    const level = loadValidLevelForTest(discoveryText);
    const save = { ...createLevelSaveState(createGameState(level)), activeCharacterId:'pat' };
    await setLevelSaveState(levelUrl, save);
    const { gameState } = await prepareLevelState(level, createEmptyImageSet(), levelUrl);
    expect(level.activeCharacterId).toBe('sam');
    expect(gameState.activeCharacterId).toBe('pat');
    expect(gameState.activeSkinIdAtSelection).toBe('pat-default');
    expect(gameState.timelineSnapshot.activeCharacter.id).toBe('pat');
    expect(gameState.timelineSnapshot.activeRoom.id).toBe('study');
  });

  it('replaces the initial selected skin with the appearance at saved time', async () => {
    const level = loadValidLevelForTest(appearanceText);
    await setLevelSaveState(levelUrl, createLevelSaveState(createGameState(level), 5000));
    const { gameState } = await prepareLevelState(level, createEmptyImageSet(), levelUrl);
    expect(level.initialTime).toBe(10000);
    expect(gameState.time).toBe(5000);
    expect(gameState.activeSkinIdAtSelection).toBe('sam-default');
    expect(gameState.timelineSnapshot.activeCharacter.skinId).toBe('sam-default');
    expect(gameState.isPlaying).toBe(false);
    expect(gameState.metaTimeToGameTimeOffset).toBe(0);
    expect(gameState.metaTimeEffects).toEqual([]);
    expect(gameState.characterMetaTimeEffectsByCharacterId.size).toBe(0);
    expect(gameState.hoveredCharacterId).toBeNull();
    expect(gameState.viewedItemIds.size).toBe(0);
  });

  it('preserves extended-hour timeline coordinates', async () => {
    const level = loadValidLevelForTest(saveText);
    const time = level.timeline.startTime + 25000;
    await setLevelSaveState(levelUrl, createLevelSaveState(createGameState(level), time));
    const { gameState } = await prepareLevelState(level, createEmptyImageSet(), levelUrl);
    expect(gameState.time).toBe(25 * 3600000 + 25000);
  });

  it('clears an incompatible record and uses fresh state without partial restoration', async () => {
    const level = loadValidLevelForTest(saveText);
    const save = { ...createLevelSaveState(createGameState(level)), activeCharacterId:'missing',
      discoveredItemIds:['key'] };
    await setLevelSaveState(levelUrl, save);
    const prepared = await prepareLevelState(level, createEmptyImageSet(), levelUrl);
    expect(prepared.needsInitialSave).toBe(true);
    expect(prepared.gameState.discoveryState.discoveredItemIds.size).toBe(0);
    expect(prepared.gameState.activeCharacterId).toBe(level.activeCharacterId);
    await expect(getLevelSaveState(levelUrl)).resolves.toBeNull();
    expect(pathStoreMock.deleteByKey).toHaveBeenCalledOnce();
  });

  it('falls back to fresh state after storage read rejection', async () => {
    const level = loadValidLevelForTest(defaultText);
    pathStoreMock.getText.mockRejectedValueOnce(new Error('Storage unavailable'));
    const prepared = await prepareLevelState(level, createEmptyImageSet(), levelUrl);
    expect(prepared.needsInitialSave).toBe(true);
    expect(prepared.gameState.time).toBe(level.initialTime);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining(levelUrl), expect.any(Error));
  });

  it('falls back to fresh state after incompatible-record deletion rejection', async () => {
    const level = loadValidLevelForTest(defaultText);
    await setLevelSaveState(levelUrl, { ...createLevelSaveState(createGameState(level)), time:-1 });
    pathStoreMock.deleteByKey.mockRejectedValueOnce(new Error('Delete unavailable'));
    const prepared = await prepareLevelState(level, createEmptyImageSet(), levelUrl);
    expect(prepared.needsInitialSave).toBe(true);
    expect(prepared.gameState.time).toBe(level.initialTime);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Unable to clear'), expect.any(Error));
  });

  it('falls back after malformed-record cleanup fails', async () => {
    const level = loadValidLevelForTest(defaultText);
    pathStoreMock.getText.mockResolvedValueOnce('{');
    pathStoreMock.deleteByKey.mockRejectedValueOnce(new Error('Delete unavailable'));
    const prepared = await prepareLevelState(level, createEmptyImageSet(), levelUrl);
    expect(prepared.needsInitialSave).toBe(true);
    expect(prepared.gameState.time).toBe(level.initialTime);
  });

  it('does not mutate authored data when restoring completion and position', async () => {
    const level = loadValidLevelForTest(saveText);
    const original = JSON.stringify(level);
    const save = { ...createLevelSaveState(createGameState(level), level.timeline.endTime),
      completedConclusionIds:level.conclusions.map(conclusion => conclusion.id),
      incompleteConclusionAnswerIndexesById:{} };
    await setLevelSaveState(levelUrl, save);
    const { gameState } = await prepareLevelState(level, createEmptyImageSet(), levelUrl);
    expect(gameState.isLevelComplete).toBe(true);
    expect(JSON.stringify(level)).toBe(original);
    expect(gameState.timeline).toBe(level.timeline);
  });

  it('keeps same-named levels in different manifest directories isolated', async () => {
    const level = loadValidLevelForTest(defaultText);
    await setLevelSaveState('tower/first.md', createLevelSaveState(createGameState(level), level.timeline.endTime));
    const prepared = await prepareLevelState(level, createEmptyImageSet(), levelUrl);
    expect(prepared.needsInitialSave).toBe(true);
    expect(prepared.gameState.time).toBe(level.initialTime);
  });
});