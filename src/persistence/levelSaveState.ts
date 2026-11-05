/* This module groups persistence helpers for reading and writing the last selected level URL.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { deleteByKey, getText, setText } from "./pathStore";
import { fillTemplate } from "./pathUtil";
import LevelSaveState, { isValidLevelSaveState } from "./types/LevelSaveState";

const keyTemplate = '/levelSaves/${levelFilename}.json';

export async function getLevelSaveState(levelFilename:string):Promise<LevelSaveState|null|string> {
  const key = fillTemplate(keyTemplate, { levelFilename });
  const text = await getText(key);
  if (!text) return null;
  const obj = JSON.parse(text);
  if (!isValidLevelSaveState(obj)) {
    await deleteByKey(key); // So next load won't repeat error.
    throw Error(`Save state for "${levelFilename}" was corrupted.`);
  }
  return obj;
}

export async function setLevelSaveState(levelFilename:string, saveState:LevelSaveState ) {
  const key = fillTemplate(keyTemplate, { levelFilename });
  const text = JSON.stringify(saveState);
  return await setText(key, text);
}

export async function clearLevelSaveState(levelFilename:string) {
  const key = fillTemplate(keyTemplate, { levelFilename });
  await deleteByKey(key);
}