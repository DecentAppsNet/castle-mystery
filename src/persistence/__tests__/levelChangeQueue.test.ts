import { beforeEach, describe, expect, it, vi } from 'vitest';
import type LevelChange from '../types/LevelChange';
import { pathStoreMock } from './pathStoreMock';

vi.mock('../pathStore', () => pathStoreMock);

const filename = 'first.md';
const key = '/levelChanges/first.md.json';
const revealRoom:LevelChange = { kind:'revealRoom', roomIds:['study'] };
const revealTitles:LevelChange = { kind:'revealCharacterTitles' };
const completeLevel:LevelChange = { kind:'setLevelComplete' };

async function _startQueue() {
  vi.resetModules();
  const queue = await import('../levelChangeQueue');
  await queue.initLevelChanges();
  return queue;
}

describe('levelChangeQueue', () => {
  beforeEach(() => pathStoreMock.reset());

  it('finds persisted changes at startup and destructively pops them by filename', async () => {
    const firstSession = await _startQueue();
    await firstSession.pushLevelChanges(filename, revealRoom);
    expect(pathStoreMock.values[key]).toBe(JSON.stringify({ changes:[revealRoom] }));

    const nextSession = await _startQueue();
    await expect(nextSession.popLevelChanges(filename)).resolves.toEqual([revealRoom]);
    expect(pathStoreMock.deleteByKey).toHaveBeenCalledExactlyOnceWith(key);
    expect(pathStoreMock.values[key]).toBeUndefined();
    pathStoreMock.getText.mockClear();
    await expect(nextSession.popLevelChanges(filename)).resolves.toEqual([]);
    expect(pathStoreMock.getText).not.toHaveBeenCalled();
  });

  it('leaves changes for other filenames pending', async () => {
    const queue = await _startQueue();
    await queue.pushLevelChanges(filename, revealRoom);
    await queue.pushLevelChanges('second.md', completeLevel);

    await expect(queue.popLevelChanges(filename)).resolves.toEqual([revealRoom]);
    expect(pathStoreMock.deleteByKey).toHaveBeenCalledExactlyOnceWith(key);
    await expect(queue.popLevelChanges('second.md')).resolves.toEqual([completeLevel]);
  });

  it('appends overlapping pushes and preserves their submission order', async () => {
    const queue = await _startQueue();
    await Promise.all([
      queue.pushLevelChanges(filename, revealRoom),
      queue.pushLevelChanges(filename, [revealTitles, completeLevel])
    ]);

    await expect(queue.popLevelChanges(filename)).resolves.toEqual([revealRoom, revealTitles, completeLevel]);
  });

  it('surfaces a failed write without blocking a later push', async () => {
    const queue = await _startQueue();
    pathStoreMock.setText.mockRejectedValueOnce(new Error('Write failed'));
    const failed = queue.pushLevelChanges(filename, revealRoom);
    const later = queue.pushLevelChanges(filename, completeLevel);

    await expect(failed).rejects.toThrow('Write failed');
    await later;
    await expect(queue.popLevelChanges(filename)).resolves.toEqual([completeLevel]);
  });

  it('surfaces a failed delete without returning the batch or blocking the next operation', async () => {
    const queue = await _startQueue();
    await queue.pushLevelChanges(filename, revealRoom);
    pathStoreMock.deleteByKey.mockRejectedValueOnce(new Error('Delete failed'));

    await expect(queue.popLevelChanges(filename)).rejects.toThrow('Delete failed');
    await expect(queue.popLevelChanges(filename)).resolves.toEqual([revealRoom]);
  });

  it('clears the pending flag when the stored record is missing', async () => {
    pathStoreMock.values[key] = JSON.stringify({ changes:[revealRoom] });
    const queue = await _startQueue();
    delete pathStoreMock.values[key];

    await expect(queue.popLevelChanges(filename)).resolves.toEqual([]);
    await expect(queue.popLevelChanges(filename)).resolves.toEqual([]);
    expect(pathStoreMock.getText).toHaveBeenCalledExactlyOnceWith(key);
    expect(pathStoreMock.deleteByKey).not.toHaveBeenCalled();
  });
});