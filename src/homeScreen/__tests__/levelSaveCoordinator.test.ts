import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createGameState } from '@/game/gameUtil';
import { pauseGameState, updateGameState } from '@/game/gameStateUpdateUtil';
import { createDiscoveries } from '@/game/discoveriesUtil';
import PlayerEventType from '@/game/playerEvents/types/PlayerEventType';
import { ImageSet } from '@/imageLoading';
import { createLevelSaveState } from '@/game/levelSaveStateUtil';
import { loadValidLevelForTest } from '@/levelLoading/__tests__/testLevelUtil';
import levelText from '@/game/__tests__/fixtures/save-state.md?raw';
import discoveryText from '@/game/__tests__/fixtures/discovery-state.md?raw';
import cyclingText from '@/game/__tests__/fixtures/character-cycling.md?raw';
import { getLevelSaveState, setLevelSaveState } from '@/persistence/levelSaveState';
import { initLevelChanges, popLevelChanges, pushLevelChanges } from '@/persistence/levelChangeQueue';
import { pathStoreMock } from '@/persistence/__tests__/pathStoreMock';
import LevelSaveCoordinator from '../levelSaveCoordinator';
import { prepareLevelState } from '../levelPreparation';

vi.mock('@/persistence/pathStore', async () => {
  const { pathStoreMock } = await import('@/persistence/__tests__/pathStoreMock');
  return pathStoreMock;
});

function _createState() {
  return createGameState(loadValidLevelForTest(levelText));
}

describe('LevelSaveCoordinator', () => {
  beforeEach(() => {
    pathStoreMock.reset();
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('uses restored progress as its baseline without writing', async () => {
    const state = _createState();
    state.discoveryState.discoveredItemIds.add('key');
    const coordinator = new LevelSaveCoordinator('/levels/castle.md', state);
    coordinator.observe();
    await coordinator.stopAndSettle();
    expect(pathStoreMock.setText).not.toHaveBeenCalled();
  });

  it('settles a deferred write before clearing and never recreates the deleted save', async () => {
    const state = _createState();
    const coordinator = new LevelSaveCoordinator('castle.md', state);
    let finishWrite!:() => void;
    pathStoreMock.setText.mockImplementationOnce((key, text) => new Promise(resolve => {
      finishWrite = () => { pathStoreMock.values[key] = text; resolve(); };
    }));
    state.discoveryState.discoveredItemIds.add('key');
    coordinator.observe();
    await Promise.resolve();
    state.time += 1000;
    coordinator.observe();
    const cleared = coordinator.clearSaveAfterSettling();
    expect(pathStoreMock.deleteByKey).not.toHaveBeenCalled();
    state.discoveryState.discoveredSkinIds.add('sam-default');
    coordinator.observe();
    finishWrite();
    await cleared;
    await vi.advanceTimersByTimeAsync(5000);
    expect(pathStoreMock.setText).toHaveBeenCalledOnce();
    expect(pathStoreMock.deleteByKey).toHaveBeenCalledOnce();
    await expect(getLevelSaveState('castle.md')).resolves.toBeNull();
  });

  it('stages one matching pop before the next snapshot and committed-time save', async () => {
    await initLevelChanges();
    await pushLevelChanges('world.md', [{ kind:'revealRoom', roomIds:['study'] }, { kind:'revealCharacterTitles' }]);
    await pushLevelChanges('inactive.md', { kind:'setLevelComplete' });
    const state = createGameState(loadValidLevelForTest(discoveryText));
    const committedTime = state.time;
    const coordinator = new LevelSaveCoordinator('/levels/world.md', state);
    const deletion = Promise.withResolvers<void>();
    pathStoreMock.deleteByKey.mockReturnValueOnce(deletion.promise);
    pathStoreMock.getText.mockClear();
    coordinator.beforeFrame();
    await vi.advanceTimersByTimeAsync(0);
    coordinator.beforeFrame();
    await vi.advanceTimersByTimeAsync(0);
    expect(pathStoreMock.getText).toHaveBeenCalledExactlyOnceWith('/levelChanges/world.md.json');

    delete pathStoreMock.values['/levelChanges/world.md.json'];
    deletion.resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(state.discoveryState.obscuredRoomIds).toContain('study');
    coordinator.beforeFrame();
    expect(state.discoveryState.obscuredRoomIds).not.toContain('study');
    state.time += 100;
    updateGameState(state, [], 0, 1, () => coordinator.observe());
    expect(state.discoveryState.discoveredRoomIds).not.toContain('study');
    await vi.advanceTimersByTimeAsync(0);
    await expect(getLevelSaveState('world.md')).resolves.toMatchObject({
      time:committedTime, revealedRoomIds:['study'], titleKnownCharacterIds:['sam', 'pat']
    });
    await coordinator.stopAndSettle();
    await expect(popLevelChanges('inactive.md')).resolves.toEqual([{ kind:'setLevelComplete' }]);
  });

  it('saves queued world completion and its discoveries in one snapshot', async () => {
    await initLevelChanges();
    await pushLevelChanges('completion.md', [{ kind:'revealCharacterTitles' }, { kind:'setLevelComplete' }]);
    const state = createGameState(loadValidLevelForTest(discoveryText));
    const coordinator = new LevelSaveCoordinator('completion.md', state);
    coordinator.beforeFrame();
    await vi.advanceTimersByTimeAsync(0);
    coordinator.beforeFrame();
    updateGameState(state, [], 0, 1, () => coordinator.observe());
    await coordinator.stopAndSettle();

    expect(state.isLevelComplete).toBe(true);
    await expect(getLevelSaveState('completion.md')).resolves.toMatchObject({
      isLevelComplete:true, revealedRoomIds:['study'], discoveredRoomIds:['hall', 'study'],
      discoveredItemIds:['brass key'], discoveredSkinIds:expect.arrayContaining(['sam-default', 'pat-default']),
      titleKnownCharacterIds:['sam', 'pat']
    });
  });

  it('settles an outgoing pop and its save before replacement without another frame', async () => {
    await initLevelChanges();
    await pushLevelChanges('outgoing.md', { kind:'revealRoom', roomIds:['study'] });
    const state = createGameState(loadValidLevelForTest(discoveryText));
    const coordinator = new LevelSaveCoordinator('outgoing.md', state);
    const deletion = Promise.withResolvers<void>();
    const write = Promise.withResolvers<void>();
    pathStoreMock.deleteByKey.mockReturnValueOnce(deletion.promise);
    pathStoreMock.setText.mockClear().mockReturnValueOnce(write.promise);
    coordinator.beforeFrame();
    const replace = vi.fn();
    const settled = coordinator.stopAndSettle(true).then(replace);
    coordinator.beforeFrame();
    await vi.advanceTimersByTimeAsync(0);
    expect(replace).not.toHaveBeenCalled();
    expect(pathStoreMock.setText).not.toHaveBeenCalled();

    deletion.resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(state.discoveryState.obscuredRoomIds).not.toContain('study');
    expect(pathStoreMock.setText).toHaveBeenCalledExactlyOnceWith('/levelSaves/$outgoing.md.json',
      expect.stringContaining('"revealedRoomIds":["study"]'));
    expect(replace).not.toHaveBeenCalled();
    write.resolve();
    await settled;
    expect(replace).toHaveBeenCalledOnce();
  });

  it('reports a failed pop once without applying or acknowledging the batch', async () => {
    await initLevelChanges();
    await pushLevelChanges('failed-pop.md', { kind:'revealRoom', roomIds:['study'] });
    const state = createGameState(loadValidLevelForTest(discoveryText));
    const onStorageError = vi.fn();
    const coordinator = new LevelSaveCoordinator('failed-pop.md', state, false, onStorageError);
    pathStoreMock.deleteByKey.mockRejectedValueOnce(new Error('Delete failed'));
    pathStoreMock.setText.mockClear();
    coordinator.beforeFrame();
    await vi.advanceTimersByTimeAsync(0);
    coordinator.beforeFrame();
    coordinator.observe();
    await coordinator.stopAndSettle();

    expect(onStorageError).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('failed-pop.md'));
    expect(pathStoreMock.deleteByKey).toHaveBeenCalledOnce();
    expect(pathStoreMock.values['/levelChanges/failed-pop.md.json']).toBeDefined();
    expect(pathStoreMock.setText).not.toHaveBeenCalled();
    expect(state.discoveryState.obscuredRoomIds).toContain('study');
  });

  it('reports a failed world save without replaying the popped batch or retrying the same save', async () => {
    await initLevelChanges();
    await pushLevelChanges('failed-save.md', { kind:'revealRoom', roomIds:['study'] });
    const state = createGameState(loadValidLevelForTest(discoveryText));
    const onStorageError = vi.fn();
    const coordinator = new LevelSaveCoordinator('failed-save.md', state, false, onStorageError);
    pathStoreMock.setText.mockClear().mockRejectedValueOnce(new Error('Save failed'));
    coordinator.beforeFrame();
    await vi.advanceTimersByTimeAsync(0);
    coordinator.beforeFrame();
    coordinator.observe();
    await vi.advanceTimersByTimeAsync(0);
    coordinator.beforeFrame();
    coordinator.observe();
    await coordinator.stopAndSettle();

    expect(onStorageError).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('failed-save.md'));
    expect(pathStoreMock.setText).toHaveBeenCalledOnce();
    await expect(getLevelSaveState('failed-save.md')).resolves.toBeNull();
    await expect(popLevelChanges('failed-save.md')).resolves.toEqual([]);
  });

  it('submits fresh initial progress exactly once when requested', async () => {
    const state = _createState();
    const coordinator = new LevelSaveCoordinator('/levels/castle.md', state, true);
    coordinator.observe();
    coordinator.observe();
    await coordinator.stopAndSettle();
    expect(pathStoreMock.setText).toHaveBeenCalledOnce();
    await expect(getLevelSaveState('castle.md')).resolves.toMatchObject({ time:state.time });
  });

  it('waits for a deferred outgoing flush before same-level preparation reads progress', async () => {
    const state = _createState();
    const outgoing = new LevelSaveCoordinator('castle.md', state);
    let finishWrite!:() => void;
    pathStoreMock.setText.mockImplementationOnce((key, text) => new Promise(resolve => {
      finishWrite = () => { pathStoreMock.values[key] = text; resolve(); };
    }));
    state.time += 1000;
    state.discoveryState.discoveredItemIds.add('key');
    outgoing.observe();
    await Promise.resolve();
    const reentered = outgoing.stopAndSettle(true).then(() =>
      prepareLevelState(loadValidLevelForTest(levelText), new ImageSet(), 'castle.md'));
    expect(pathStoreMock.getText).not.toHaveBeenCalled();
    finishWrite();
    const prepared = await reentered;
    expect(pathStoreMock.setText).toHaveBeenCalledTimes(2);
    expect(prepared.gameState.time).toBe(state.time);
    expect(prepared.gameState.discoveryState.discoveredItemIds).toContain('key');
    expect(prepared.needsInitialSave).toBe(false);
  });

  it('allows replacement saves only after earlier same-key writes have settled', async () => {
    const state = _createState();
    const outgoing = new LevelSaveCoordinator('castle.md', state);
    let finishWrite!:() => void;
    pathStoreMock.setText.mockImplementationOnce((key, text) => new Promise(resolve => {
      finishWrite = () => { pathStoreMock.values[key] = text; resolve(); };
    }));
    state.discoveryState.discoveredItemIds.add('key');
    outgoing.observe();
    await Promise.resolve();
    const settled = outgoing.stopAndSettle(true);
    finishWrite();
    await settled;
    const prepared = await prepareLevelState(loadValidLevelForTest(levelText), new ImageSet(), 'castle.md');
    const incoming = new LevelSaveCoordinator(prepared.levelUrl, prepared.gameState, prepared.needsInitialSave);
    prepared.gameState.discoveryState.titleKnownCharacterIds.add('sam');
    incoming.observe();
    state.discoveryState.discoveredItemIds.clear();
    outgoing.observe();
    await incoming.stopAndSettle();
    await expect(getLevelSaveState('castle.md')).resolves.toMatchObject({ discoveredItemIds:['key'], titleKnownCharacterIds:['sam'] });
  });

  it('prepares the same level fresh after Reset and cannot restore outgoing progress later', async () => {
    const state = _createState();
    const outgoing = new LevelSaveCoordinator('castle.md', state, true);
    state.discoveryState.discoveredItemIds.add('key');
    state.time += 1000;
    outgoing.observe();
    await outgoing.clearSaveAfterSettling();
    const prepared = await prepareLevelState(loadValidLevelForTest(levelText), new ImageSet(), 'castle.md');
    expect(prepared.levelUrl).toBe('castle.md');
    expect(prepared.gameState.time).toBe(state.timeline.startTime);
    expect(prepared.gameState.discoveryState.discoveredItemIds.size).toBe(0);
    expect(prepared.needsInitialSave).toBe(true);
    const incoming = new LevelSaveCoordinator(prepared.levelUrl, prepared.gameState, prepared.needsInitialSave);
    outgoing.observe();
    await vi.advanceTimersByTimeAsync(5000);
    await incoming.stopAndSettle();
    const revisited = await prepareLevelState(loadValidLevelForTest(levelText), new ImageSet(), 'castle.md');
    expect(revisited.gameState.discoveryState.discoveredItemIds.size).toBe(0);
    expect(revisited.gameState.time).toBe(state.timeline.startTime);
    expect(revisited.needsInitialSave).toBe(false);
  });

  it('awaits deletion before fresh preparation can start', async () => {
    const state = _createState();
    const outgoing = new LevelSaveCoordinator('castle.md', state, true);
    await Promise.resolve();
    let finishDelete!:() => void;
    pathStoreMock.deleteByKey.mockImplementationOnce(key => new Promise(resolve => {
      finishDelete = () => { delete pathStoreMock.values[key]; resolve(); };
    }));
    const cleared = outgoing.clearSaveAfterSettling();
    await vi.advanceTimersByTimeAsync(0);
    const reloaded = cleared.then(() =>
      prepareLevelState(loadValidLevelForTest(levelText), new ImageSet(), 'castle.md'));
    expect(pathStoreMock.deleteByKey).toHaveBeenCalledOnce();
    expect(pathStoreMock.getText).not.toHaveBeenCalled();
    finishDelete();
    expect((await reloaded).needsInitialSave).toBe(true);
  });

  it('propagates clear failure and keeps outgoing submissions stopped', async () => {
    const state = _createState();
    const outgoing = new LevelSaveCoordinator('castle.md', state);
    pathStoreMock.deleteByKey.mockRejectedValueOnce(new Error('Delete unavailable'));
    state.time += 1000;
    outgoing.observe();
    await expect(outgoing.clearSaveAfterSettling()).rejects.toThrow('Delete unavailable');
    state.discoveryState.discoveredItemIds.add('key');
    outgoing.observe();
    await vi.advanceTimersByTimeAsync(5000);
    expect(pathStoreMock.setText).not.toHaveBeenCalled();
  });

  it('clears only the outgoing coordinator key, leaving other levels intact', async () => {
    const first = new LevelSaveCoordinator('/levels/castle/first.md', _createState(), true);
    const second = new LevelSaveCoordinator('/levels/tower/second.md', _createState(), true);
    await second.stopAndSettle();
    await first.clearSaveAfterSettling();
    await expect(getLevelSaveState('first.md')).resolves.toBeNull();
    await expect(getLevelSaveState('second.md')).resolves.not.toBeNull();
  });

  it('observes progress without returning a storage promise', async () => {
    const state = _createState();
    const coordinator = new LevelSaveCoordinator('castle.md', state);
    let finishWrite!:() => void;
    pathStoreMock.setText.mockImplementationOnce(() => new Promise(resolve => { finishWrite = resolve; }));
    state.discoveryState.discoveredItemIds.add('key');
    expect(coordinator.observe()).toBeUndefined();
    await Promise.resolve();
    expect(pathStoreMock.setText).toHaveBeenCalledOnce();
    finishWrite();
    await coordinator.stopAndSettle();
  });

  it('observes raw title changes even when the discoveries summary is unchanged', async () => {
    const state = _createState();
    const coordinator = new LevelSaveCoordinator('castle.md', state);
    const summary = createDiscoveries(state);
    state.discoveryState.titleKnownCharacterIds.add('sam');
    updateGameState(state, [], 100, 1, () => coordinator.observe());
    expect(createDiscoveries(state)).toEqual(summary);
    await coordinator.stopAndSettle();
    await expect(getLevelSaveState('castle.md')).resolves.toMatchObject({ titleKnownCharacterIds:['sam'] });
  });

  it('debounces a synchronous page-hide pause without another simulation frame', async () => {
    const state = _createState();
    const coordinator = new LevelSaveCoordinator('castle.md', state);
    updateGameState(state, [{ type:PlayerEventType.PLAY_PAUSE, isPlaying:true }], 100, 1,
      () => coordinator.observe());
    updateGameState(state, [], 1100, 1, () => coordinator.observe());
    pauseGameState(state, () => coordinator.observe());
    expect(pathStoreMock.setText).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(3000);
    await coordinator.stopAndSettle();
    await expect(getLevelSaveState('castle.md')).resolves.toMatchObject({ time:state.timeline.startTime + 1000 });
  });

  it('observes changed skin IDs even when their displayed icons and counts match', async () => {
    const state = createGameState(loadValidLevelForTest(discoveryText));
    state.discoveryState.discoveredSkinIds.add('sam-default');
    const summary = createDiscoveries(state);
    const coordinator = new LevelSaveCoordinator('castle.md', state);
    state.discoveryState.discoveredSkinIds.clear();
    state.discoveryState.discoveredSkinIds.add('pat-default');
    updateGameState(state, [], 100, 1, () => coordinator.observe());
    expect(createDiscoveries(state)).toEqual(summary);
    await coordinator.stopAndSettle();
    await expect(getLevelSaveState('castle.md')).resolves.toMatchObject({ discoveredSkinIds:['pat-default'] });
  });

  it('saves active character selection applied through a player event', async () => {
    const state = createGameState(loadValidLevelForTest(cyclingText));
    const coordinator = new LevelSaveCoordinator('castle.md', state);
    updateGameState(state, [{ type:PlayerEventType.NEXT_CHARACTER }], 100, 1, () => coordinator.observe());
    await coordinator.stopAndSettle();
    expect(state.activeCharacterId).toBe('pat');
    await expect(getLevelSaveState('castle.md')).resolves.toMatchObject({ activeCharacterId:'pat' });
  });

  it('attaches after real preparation without resubmitting restored progress', async () => {
    const level = loadValidLevelForTest(levelText);
    const saved = { ...createLevelSaveState(createGameState(level)), discoveredItemIds:['key'] };
    await setLevelSaveState('castle.md', saved);
    pathStoreMock.setText.mockClear();
    const prepared = await prepareLevelState(level, new ImageSet(), 'castle.md');
    expect(pathStoreMock.setText).not.toHaveBeenCalled();
    const coordinator = new LevelSaveCoordinator(prepared.levelUrl, prepared.gameState, prepared.needsInitialSave);
    updateGameState(prepared.gameState, [], 100, 1, () => coordinator.observe());
    await coordinator.stopAndSettle();
    expect(pathStoreMock.setText).not.toHaveBeenCalled();
    expect(prepared.gameState.discoveryState.discoveredItemIds).toContain('key');
  });

  it('submits prepared fresh initial progress once before unchanged simulation updates', async () => {
    const prepared = await prepareLevelState(loadValidLevelForTest(levelText), new ImageSet(), 'castle.md');
    expect(pathStoreMock.setText).not.toHaveBeenCalled();
    const coordinator = new LevelSaveCoordinator(prepared.levelUrl, prepared.gameState, prepared.needsInitialSave);
    updateGameState(prepared.gameState, [], 100, 1, () => coordinator.observe());
    await coordinator.stopAndSettle();
    expect(pathStoreMock.setText).toHaveBeenCalledOnce();
    await expect(getLevelSaveState('castle.md')).resolves.toEqual(createLevelSaveState(prepared.gameState));
  });

  it('retains committed time during playback and progress changes', async () => {
    const state = _createState();
    const committedTime = state.time;
    const coordinator = new LevelSaveCoordinator('castle.md', state);
    state.isPlaying = true;
    state.time = state.timeline.endTime;
    coordinator.observe();
    expect(pathStoreMock.setText).not.toHaveBeenCalled();
    state.discoveryState.discoveredItemIds.add('key');
    coordinator.observe();
    await coordinator.stopAndSettle();
    await expect(getLevelSaveState('castle.md')).resolves.toMatchObject({ time:committedTime, discoveredItemIds:['key'] });
  });

  it('deduplicates unchanged progress after a changed snapshot is queued', async () => {
    const state = _createState();
    const coordinator = new LevelSaveCoordinator('castle.md', state);
    state.discoveryState.discoveredItemIds.add('key');
    coordinator.observe();
    coordinator.observe();
    state.time += 1000;
    coordinator.observe();
    await coordinator.stopAndSettle();
    expect(pathStoreMock.setText).toHaveBeenCalledOnce();
  });

  it('captures discoveries before later mutations', async () => {
    const state = _createState();
    const coordinator = new LevelSaveCoordinator('castle.md', state);
    state.discoveryState.discoveredItemIds.add('key');
    coordinator.observe();
    state.discoveryState.discoveredItemIds.clear();
    await coordinator.stopAndSettle();
    await expect(getLevelSaveState('castle.md')).resolves.toMatchObject({ discoveredItemIds:['key'] });
  });

  it('serializes deferred writes so later progress cannot be overwritten by an earlier save', async () => {
    const state = _createState();
    const coordinator = new LevelSaveCoordinator('castle.md', state);
    let finishWrite!:() => void;
    pathStoreMock.setText.mockImplementationOnce((key, text) => new Promise(resolve => {
      finishWrite = () => { pathStoreMock.values[key] = text; resolve(); };
    }));
    state.discoveryState.discoveredItemIds.add('key');
    coordinator.observe();
    await Promise.resolve();
    state.discoveryState.discoveredSkinIds.add('sam-default');
    coordinator.observe();
    await Promise.resolve();
    expect(pathStoreMock.setText).toHaveBeenCalledOnce();
    const settled = coordinator.stopAndSettle();
    finishWrite();
    await settled;
    expect(pathStoreMock.setText).toHaveBeenCalledTimes(2);
    expect(JSON.parse(pathStoreMock.setText.mock.calls[0][1]!)).toMatchObject({ discoveredSkinIds:[] });
    await expect(getLevelSaveState('castle.md')).resolves.toMatchObject({ discoveredItemIds:['key'], discoveredSkinIds:['sam-default'] });
  });

  it('logs a failed write and allows later queued progress to save', async () => {
    const state = _createState();
    const coordinator = new LevelSaveCoordinator('castle.md', state);
    pathStoreMock.setText.mockRejectedValueOnce(new Error('Write failed'));
    state.discoveryState.discoveredItemIds.add('key');
    coordinator.observe();
    state.discoveryState.discoveredSkinIds.add('sam-default');
    coordinator.observe();
    await expect(coordinator.stopAndSettle()).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('castle.md'), expect.any(Error));
    await expect(getLevelSaveState('castle.md')).resolves.toMatchObject({ discoveredItemIds:['key'], discoveredSkinIds:['sam-default'] });
  });

  it('stops stale callbacks while settling previously queued writes', async () => {
    const state = _createState();
    const coordinator = new LevelSaveCoordinator('castle.md', state);
    state.discoveryState.discoveredItemIds.add('key');
    coordinator.observe();
    const settled = coordinator.stopAndSettle();
    state.discoveryState.discoveredSkinIds.add('sam-default');
    coordinator.observe();
    await settled;
    await coordinator.stopAndSettle();
    expect(pathStoreMock.setText).toHaveBeenCalledOnce();
    await expect(getLevelSaveState('castle.md')).resolves.toMatchObject({ discoveredSkinIds:[] });
  });

  it('coalesces sustained paused scrubbing into one write after three quiet seconds', async () => {
    const state = _createState();
    const coordinator = new LevelSaveCoordinator('castle.md', state);
    state.time += 1000;
    coordinator.observe();
    await vi.advanceTimersByTimeAsync(2000);
    state.time += 1000;
    coordinator.observe();
    await vi.advanceTimersByTimeAsync(2999);
    expect(pathStoreMock.setText).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await coordinator.stopAndSettle();
    expect(pathStoreMock.setText).toHaveBeenCalledOnce();
    await expect(getLevelSaveState('castle.md')).resolves.toMatchObject({ time:state.time });
  });

  it('saves entry into pause even without a subsequent time change', async () => {
    const state = _createState();
    state.isPlaying = true;
    const coordinator = new LevelSaveCoordinator('castle.md', state);
    state.time += 1000;
    coordinator.observe();
    state.isPlaying = false;
    coordinator.observe();
    await vi.advanceTimersByTimeAsync(3000);
    await coordinator.stopAndSettle();
    await expect(getLevelSaveState('castle.md')).resolves.toMatchObject({ time:state.time });
  });

  it('cancels pending paused time when playback resumes', async () => {
    const state = _createState();
    const coordinator = new LevelSaveCoordinator('castle.md', state);
    state.time += 1000;
    coordinator.observe();
    await vi.advanceTimersByTimeAsync(2000);
    state.isPlaying = true;
    coordinator.observe();
    await vi.advanceTimersByTimeAsync(3000);
    await coordinator.stopAndSettle(true);
    expect(pathStoreMock.setText).not.toHaveBeenCalled();
  });

  it('keeps committed time for immediate progress and saves latest progress at timer expiry', async () => {
    const state = _createState();
    const committedTime = state.time;
    const coordinator = new LevelSaveCoordinator('castle.md', state);
    state.time += 1000;
    coordinator.observe();
    await vi.advanceTimersByTimeAsync(2000);
    state.discoveryState.discoveredItemIds.add('key');
    coordinator.observe();
    await vi.advanceTimersByTimeAsync(0);
    await expect(getLevelSaveState('castle.md')).resolves.toMatchObject({ time:committedTime, discoveredItemIds:['key'] });
    state.discoveryState.discoveredSkinIds.add('sam-default');
    await vi.advanceTimersByTimeAsync(1000);
    await coordinator.stopAndSettle();
    expect(pathStoreMock.setText).toHaveBeenCalledTimes(2);
    await expect(getLevelSaveState('castle.md')).resolves.toMatchObject({ time:state.time,
      discoveredItemIds:['key'], discoveredSkinIds:['sam-default'] });
  });

  it('uses the newly committed position for later immediate progress saves', async () => {
    const state = _createState();
    const coordinator = new LevelSaveCoordinator('castle.md', state);
    state.time += 1000;
    coordinator.observe();
    await vi.advanceTimersByTimeAsync(3000);
    const committedTime = state.time;
    state.time += 1000;
    state.discoveryState.discoveredItemIds.add('key');
    coordinator.observe();
    await coordinator.stopAndSettle();
    await expect(getLevelSaveState('castle.md')).resolves.toMatchObject({ time:committedTime, discoveredItemIds:['key'] });
  });

  it('flushes outstanding paused position on ordinary transition without later timer writes', async () => {
    const state = _createState();
    const coordinator = new LevelSaveCoordinator('castle.md', state);
    state.time += 1000;
    coordinator.observe();
    await coordinator.stopAndSettle(true);
    await expect(getLevelSaveState('castle.md')).resolves.toMatchObject({ time:state.time });
    state.time += 1000;
    coordinator.observe();
    await vi.advanceTimersByTimeAsync(5000);
    await coordinator.stopAndSettle(true);
    expect(pathStoreMock.setText).toHaveBeenCalledOnce();
  });

  it('cancels outstanding paused position for Reset and never submits it later', async () => {
    const state = _createState();
    const coordinator = new LevelSaveCoordinator('castle.md', state);
    state.time += 1000;
    coordinator.observe();
    await coordinator.stopAndSettle();
    await vi.advanceTimersByTimeAsync(5000);
    coordinator.observe();
    await coordinator.stopAndSettle(true);
    expect(pathStoreMock.setText).not.toHaveBeenCalled();
  });

  it('does not continuously save playback time', async () => {
    const state = _createState();
    const coordinator = new LevelSaveCoordinator('castle.md', state);
    state.isPlaying = true;
    state.time += 1000;
    coordinator.observe();
    await vi.advanceTimersByTimeAsync(3000);
    state.time += 1000;
    coordinator.observe();
    await vi.advanceTimersByTimeAsync(3000);
    await coordinator.stopAndSettle(true);
    expect(pathStoreMock.setText).not.toHaveBeenCalled();
  });

  it('keeps each originating full level path independent', async () => {
    const firstState = _createState();
    const secondState = _createState();
    const first = new LevelSaveCoordinator('/levels/castle/first.md', firstState);
    const second = new LevelSaveCoordinator('/levels/tower/second.md', secondState);
    firstState.discoveryState.discoveredItemIds.add('key');
    secondState.discoveryState.discoveredSkinIds.add('sam-default');
    first.observe();
    second.observe();
    await Promise.all([first.stopAndSettle(), second.stopAndSettle()]);
    await expect(getLevelSaveState('first.md')).resolves.toMatchObject({ discoveredItemIds:['key'], discoveredSkinIds:[] });
    await expect(getLevelSaveState('second.md')).resolves.toMatchObject({ discoveredItemIds:[], discoveredSkinIds:['sam-default'] });
  });
});