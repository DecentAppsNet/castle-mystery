import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createGameState } from '@/game/gameUtil';
import ClozeBlank from '@/game/conclusions/types/ClozeBlank';
import ClozePartType from '@/game/conclusions/types/ClozePartType';
import { loadValidLevelForTest } from '@/levelLoading/__tests__/testLevelUtil';
import levelText from '@/game/__tests__/fixtures/save-state.md?raw';
import { getLevelSaveState } from '@/persistence/levelSaveState';
import { pathStoreMock } from '@/persistence/__tests__/pathStoreMock';
import LevelSaveCoordinator from '../levelSaveCoordinator';

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

  it('submits fresh initial progress exactly once when requested', async () => {
    const state = _createState();
    const coordinator = new LevelSaveCoordinator('/levels/castle.md', state, true);
    coordinator.observe();
    coordinator.observe();
    await coordinator.stopAndSettle();
    expect(pathStoreMock.setText).toHaveBeenCalledOnce();
    await expect(getLevelSaveState('/levels/castle.md')).resolves.toMatchObject({ time:state.time });
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

  it('captures answers and discoveries before later mutations', async () => {
    const state = _createState();
    const coordinator = new LevelSaveCoordinator('castle.md', state);
    const conclusion = state.conclusions.find(conclusion => conclusion.id === 'mystery')!;
    const blank = conclusion.parts.find(part => part.type === ClozePartType.blank) as ClozeBlank;
    blank.playerAnswerIndex = 1;
    state.discoveryState.discoveredItemIds.add('key');
    coordinator.observe();
    blank.playerAnswerIndex = 0;
    state.discoveryState.discoveredItemIds.clear();
    conclusion.isComplete = true;
    await coordinator.stopAndSettle();
    await expect(getLevelSaveState('castle.md')).resolves.toMatchObject({
      discoveredItemIds:['key'], completedConclusionIds:[], incompleteConclusionAnswerIndexesById:{ mystery:[1, -1] }
    });
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
    const second = new LevelSaveCoordinator('/levels/tower/first.md', secondState);
    firstState.discoveryState.discoveredItemIds.add('key');
    secondState.discoveryState.discoveredSkinIds.add('sam-default');
    first.observe();
    second.observe();
    await Promise.all([first.stopAndSettle(), second.stopAndSettle()]);
    await expect(getLevelSaveState('/levels/castle/first.md')).resolves.toMatchObject({ discoveredItemIds:['key'], discoveredSkinIds:[] });
    await expect(getLevelSaveState('/levels/tower/first.md')).resolves.toMatchObject({ discoveredItemIds:[], discoveredSkinIds:['sam-default'] });
  });
});