/* This module groups home-screen initialization helpers that load the selected level and create initial runtime state.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { msecsToMinutes } from "./gameplay";
import { createGameState } from "@/game/gameUtil";
import { createImageSetFromLevel } from "@/game/imageSetUtil";
import { loadLevelFromUrl, loadLevelManifestFromUrl } from "@/levelLoading";
import LevelManifest from "@/levelLoading/types/LevelManifest";
import GameState from "@/game/types/GameState";

export type InitResults = {
  gameState:GameState,
  minutes:number,
  levelManifest:LevelManifest
}

let _initPromise:Promise<InitResults|null>|null = null;

function _checkRequiredBrowserApisSupported() {
  const missingApis:string[] = [];
  if (typeof fetch !== 'function') missingApis.push('fetch()');
  if (typeof createImageBitmap !== 'function') missingApis.push('createImageBitmap()');
  if (typeof document === 'undefined') missingApis.push('document');
  if (typeof HTMLCanvasElement === 'undefined') missingApis.push('HTMLCanvasElement');
  if (missingApis.length <= 0) return;
  throw new Error(`This browser is not supported. Missing required web APIs: ${missingApis.join(', ')}.`);
}

async function _runInit():Promise<InitResults|null> {
  _checkRequiredBrowserApisSupported();
  const levelManifest = await loadLevelManifestFromUrl('/levels/levels.md');
  const initialLevelUrl = levelManifest.levelUrls[levelManifest.lastLevelI] ?? levelManifest.levelUrls[0];
  const { level, errors } = await loadLevelFromUrl(initialLevelUrl);
  if (!level) {
    console.error(errors.describeErrors());
    throw new Error('Level could not be loaded due to errors. See console for details.');
  }
  const imageSet = await createImageSetFromLevel(level);
  const gameState = createGameState(level, imageSet);
  const minutes = msecsToMinutes(gameState.time);
  return {
    gameState,
    minutes,
    levelManifest
  };
}

export function init():Promise<InitResults|null> {
  if (_initPromise) return _initPromise;
  _initPromise = _runInit().catch(error => {
    _initPromise = null;
    throw error;
  });
  return _initPromise;
}