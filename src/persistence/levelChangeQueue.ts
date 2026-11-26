/* This file reads, writes, and clears persistent level progress records.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assert } from "decent-portal";

import { deleteByKey, getAllKeysAtPath, getText, setText } from "./pathStore";
import { fillTemplate } from "./pathUtil";
import LevelChange from "./types/LevelChange";
import LevelChanges, { isValidLevelChanges } from "./types/LevelChanges";

const keyPath = '/levelChanges/'
const keyTemplate = '/levelChanges/${levelFilename}.json';

const theState = {
  isInitialized:false,
  levelsWithPendingChanges:new Set<string>(), // Stores keys for levels.
  lastOperation:Promise.resolve()
}

async function _removeKey(key:string) {
  await deleteByKey(key);
  theState.levelsWithPendingChanges.delete(key);
}

async function _setLevelChanges(key:string, levelChanges:LevelChanges) {
  const text = JSON.stringify(levelChanges);
  return await setText(key, text);
}

async function _getLevelChanges(key:string):Promise<LevelChanges|null> {
  const text = await getText(key);
  if (text === null) return null;
  let obj:unknown;
  try {
    obj = JSON.parse(text);
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
  }
  if (!isValidLevelChanges(obj)) {
    await _removeKey(key); // So next load won't repeat error.
    return null;
  }
  return obj;
}

async function _pushLevelChanges(levelFilename:string, levelChanges:LevelChange|LevelChange[]) {
  if (!Array.isArray(levelChanges)) levelChanges = [levelChanges];
  const key = fillTemplate(keyTemplate, { levelFilename });
  const draft:LevelChanges = await _getLevelChanges(key) ?? { changes:[] };
  draft.changes = [...draft.changes, ...levelChanges];
  await _setLevelChanges(key, draft);
  theState.levelsWithPendingChanges.add(key);
}

async function _popLevelChanges(key:string):Promise<LevelChange[]> {
  const levelChanges = await _getLevelChanges(key);
  if (levelChanges === null) return [];
  await _removeKey(key);
  return levelChanges.changes;
}

function _runInOrder<Result>(operation:() => Promise<Result>):Promise<Result> {
  const result = theState.lastOperation.then(operation);
  theState.lastOperation = result.then(() => undefined, () => undefined);
  return result;
}

// Push one or more level changes to persistent queue.
export async function pushLevelChanges(levelFilename:string, levelChanges:LevelChange|LevelChange[]) {
  assert(theState.isInitialized);
  return _runInOrder(() => _pushLevelChanges(levelFilename, levelChanges));
}

// Pop all pending changings for a level.
export async function popLevelChanges(levelFilename:string):Promise<LevelChange[]> {
  assert(theState.isInitialized);
  const key = fillTemplate(keyTemplate, { levelFilename });
  if (!theState.levelsWithPendingChanges.has(key)) return []; // Cheap exit suitable for 60 FPS calls.
  return _runInOrder(() => _popLevelChanges(key));
}

// Call once per session to initialize tracking structure from persistent storage.
export async function initLevelChanges() {
  if (theState.isInitialized) return;
  const keys = await getAllKeysAtPath(keyPath);
  keys.forEach(theState.levelsWithPendingChanges.add);
  theState.isInitialized = true;
}