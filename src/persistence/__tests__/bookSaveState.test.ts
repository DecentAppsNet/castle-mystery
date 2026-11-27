import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getBookSaveState, setBookSaveState } from '../bookSaveState';
import BookSaveState from '../types/BookSaveState';
import fixtureText from './fixtures/bookSaveState.json?raw';
import { pathStoreMock } from './pathStoreMock';

vi.mock('../pathStore', async () => {
  const { pathStoreMock } = await import('./pathStoreMock');
  return pathStoreMock;
});

const bookUrl = '/levels/first/book.md';
const save = JSON.parse(fixtureText) as BookSaveState;

describe('bookSaveState', () => {
  beforeEach(() => pathStoreMock.reset());

  it('reports an absent snapshot as missing', async () => {
    await expect(getBookSaveState(bookUrl)).resolves.toEqual({ kind:'missing' });
  });

  it('round-trips the snapshot as JSON', async () => {
    await setBookSaveState(bookUrl, save);
    const result = await getBookSaveState(bookUrl);
    expect(result).toEqual({ kind:'found', saveState:save });
    expect(result.kind === 'found' && result.saveState).not.toBe(save);
  });

  it('isolates full URLs with the same filename', async () => {
    const secondUrl = '/levels/second/book.md';
    const secondSave = { ...save, pageNo:2 };
    await setBookSaveState(bookUrl, save);
    await setBookSaveState(secondUrl, secondSave);
    await expect(getBookSaveState(bookUrl)).resolves.toEqual({ kind:'found', saveState:save });
    await expect(getBookSaveState(secondUrl)).resolves.toEqual({ kind:'found', saveState:secondSave });
  });

  it('distinguishes URL separators from literal percent escapes', async () => {
    await setBookSaveState(bookUrl, save);
    await expect(getBookSaveState('/levels/first%2Fbook.md')).resolves.toEqual({ kind:'missing' });
  });

  it('reports malformed JSON as unusable', async () => {
    pathStoreMock.getText.mockResolvedValueOnce('{');
    await expect(getBookSaveState(bookUrl)).resolves.toEqual({ kind:'unusable' });
  });

  it('reports malformed current-version data as unusable', async () => {
    pathStoreMock.getText.mockResolvedValueOnce(JSON.stringify({ version:1 }));
    await expect(getBookSaveState(bookUrl)).resolves.toEqual({ kind:'unusable' });
  });

  it('reports a nonnumeric version as unusable', async () => {
    pathStoreMock.getText.mockResolvedValueOnce(JSON.stringify({ ...save, version:'2' }));
    await expect(getBookSaveState(bookUrl)).resolves.toEqual({ kind:'unusable' });
  });

  it('reports unsupported versions without validating their schema or modifying storage', async () => {
    pathStoreMock.getText.mockResolvedValueOnce(JSON.stringify({ version:2, otherSchema:true }));
    await expect(getBookSaveState(bookUrl)).resolves.toEqual({ kind:'unsupportedVersion', version:2 });
    expect(pathStoreMock.deleteByKey).not.toHaveBeenCalled();
    expect(pathStoreMock.setText).not.toHaveBeenCalled();
  });

  it('propagates read failures rather than treating them as unusable records', async () => {
    const error = new SyntaxError('Storage read failed');
    pathStoreMock.getText.mockRejectedValueOnce(error);
    await expect(getBookSaveState(bookUrl)).rejects.toBe(error);
  });

  it('propagates write failures', async () => {
    const error = new Error('Storage write failed');
    pathStoreMock.setText.mockRejectedValueOnce(error);
    await expect(setBookSaveState(bookUrl, save)).rejects.toBe(error);
  });
});