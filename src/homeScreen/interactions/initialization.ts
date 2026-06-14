/* This module groups home-screen initialization helpers that load the selected level and create initial runtime state.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { msecsToMinutes } from "./gameplay";
import { createGameState } from "@/game/gameUtil";
import { createImageSetFromLevel } from "@/game/imageSetUtil";
import { loadLevelFromUrl } from "@/levelLoading/levelUtil";
import { appendGenLevelsToManifest, loadLevelManifestFromUrl } from "@/levelLoading/manifestUtil";
import LevelManifest from "@/levelLoading/types/LevelManifest";
import GameState from "@/game/types/GameState";

export type InitResults = {
  gameState:GameState,
  minutes:number,
  levelManifest:LevelManifest
}

export async function init():Promise<InitResults|null> {
  const baseManifest = await loadLevelManifestFromUrl('/levels/levels.md');
  // `npm run dev-gen` only: surface in-progress generator candidates (_gen.*.md under public/levels/) as extra
  // "(GEN) " tabs in the level selector. Normal `npm run dev` and production builds behave as before.
  const levelManifest = import.meta.env.MODE === 'dev-gen'
    ? await appendGenLevelsToManifest(baseManifest, '/levels/levels.md')
    : baseManifest;
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