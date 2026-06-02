/* This module groups persistence helpers for reading and writing the last selected level URL.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { getText, setText } from "./pathStore";

const key = '/lastLevel.txt';

export async function getLastLevelUrl():Promise<string|null> {
  return await getText(key);
}

export async function setLastLevelUrl(levelUrl:string) {
  return await setText(key, levelUrl);
}