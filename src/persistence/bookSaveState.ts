/* This file reads and writes persistent book snapshots keyed by book URL.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { getText, setText } from './pathStore';
import BookSaveReadResult from './types/BookSaveReadResult';
import BookSaveState, { isValidBookSaveState } from './types/BookSaveState';

function _getBookSaveKey(bookUrl:string):string {
  return `/bookSaves/${encodeURIComponent(bookUrl)}.json`;
}

function _readBookSaveText(text:string):BookSaveReadResult {
  let value:unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    return { kind:'unusable' };
  }

  if (typeof value === 'object' && value !== null && !Array.isArray(value) && 'version' in value) {
    const { version } = value;
    if (typeof version === 'number' && Number.isInteger(version) && version !== 1) {
      return { kind:'unsupportedVersion', version };
    }
  }
  return isValidBookSaveState(value) ? { kind:'found', saveState:value } : { kind:'unusable' };
}

export async function getBookSaveState(bookUrl:string):Promise<BookSaveReadResult> {
  const text = await getText(_getBookSaveKey(bookUrl));
  return text === null ? { kind:'missing' } : _readBookSaveText(text);
}

export async function setBookSaveState(bookUrl:string, saveState:BookSaveState):Promise<void> {
  await setText(_getBookSaveKey(bookUrl), JSON.stringify(saveState));
}