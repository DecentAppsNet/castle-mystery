/* This module groups home-screen initialization helpers that load the selected level and create initial runtime state.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { msecsToMinutes } from "./gameplay";
import { createGameState } from "@/game/gameUtil";
import { createImageSetFromLevel } from "@/game/imageSetUtil";
import { loadLevelFromUrl } from "@/levelLoading/levelUtil";
import { loadLevelManifestFromUrl } from "@/levelLoading/manifestUtil";
import LevelManifest from "@/levelLoading/types/LevelManifest";
import GameState from "@/game/types/GameState";

export type InitResults = {
  gameState:GameState,
  minutes:number,
  levelManifest:LevelManifest
}

export async function init():Promise<InitResults|null> {
  const levelManifest = await loadLevelManifestFromUrl('/levels/levels.md');
  const initialLevelUrl = levelManifest.levelUrls[levelManifest.lastLevelI] || levelManifest.levelUrls[0] || '/levels/doors.md';
  const level = await loadLevelFromUrl(initialLevelUrl);
  const imageSet = await createImageSetFromLevel(level);
  const gameState = createGameState(level, imageSet);
  const minutes = msecsToMinutes(gameState.time);
  return {
    gameState,
    minutes,
    levelManifest
  }
}