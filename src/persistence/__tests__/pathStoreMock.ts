/* This file supplies resettable in-memory pathStore I/O for persistence-related tests.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { vi } from 'vitest';
import { keyToPath } from '../pathUtil';

const values:{ [key:string]:any } = Object.create(null);
const getText = vi.fn(async (key:string):Promise<string|null> => values[key] ?? null);
const setText = vi.fn(async (key:string, text:string|null, _mimeType?:string):Promise<void> => {
  values[key] = text;
});
const deleteByKey = vi.fn(async (key:string):Promise<void> => {
  delete values[key];
});
const getAllKeysAtPath = vi.fn(async (path:string):Promise<string[]> =>
  Object.keys(values).filter(key => keyToPath(key) === path));

function _reset() {
  Object.keys(values).forEach(key => { delete values[key]; });
  getText.mockReset();
  setText.mockReset();
  deleteByKey.mockReset();
  getAllKeysAtPath.mockReset();
}

export const pathStoreMock = { values, getText, setText, deleteByKey, getAllKeysAtPath, reset:_reset };