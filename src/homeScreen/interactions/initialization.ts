import { msecsToMinutes } from "./gameplay";
import { createGameState } from "@/game/gameUtil";
import { createImageSetFromLevel } from "@/game/imageSetUtil";
import { loadLevelFromUrl } from "@/game/levelLoading/levelUtil";
import GameState from "@/game/types/GameState";
import { baseUrl } from "@/common/urlUtil";

export type InitResults = {
  gameState:GameState,
  minutes:number
}

export async function init():Promise<InitResults|null> {
  // const level = await loadLevelFromUrl(baseUrl('/levels/murder-on-the-orient-express.md'));
  const level = await loadLevelFromUrl(baseUrl('/levels/kingacide.md'));
  const imageSet = await createImageSetFromLevel(level);
  const gameState = createGameState(level, imageSet);
  const minutes = msecsToMinutes(gameState.time);
  return {
    gameState,
    minutes
  }
}