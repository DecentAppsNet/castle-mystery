/* This file reads, writes, and clears persistent level progress records.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { deleteByKey, getText, setText } from "./pathStore";
import { fillTemplate } from "./pathUtil";
import LevelSaveState, { isValidLevelSaveState } from "./types/LevelSaveState";

const keyTemplate = '/levelSaves/${levelFilename}.json';

export async function getLevelSaveState(levelFilename:string):Promise<LevelSaveState|null> {
  const key = fillTemplate(keyTemplate, { levelFilename });
  const text = await getText(key);
  if (text === null) return null;

  // Only malformed JSON is corruption; storage failures retain their rejection.
  let obj:unknown;
  try {
    obj = JSON.parse(text);
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
  }
  if (!isValidLevelSaveState(obj)) {
    await deleteByKey(key); // So next load won't repeat error.
    return null;
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