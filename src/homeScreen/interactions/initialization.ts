import { msecsToMinutes } from "./gameplay";
import { createGameStateFromLevel } from "@/game/gameUtil";
import { loadLevelFromUrl } from "@/game/levelUtil";
import GameState from "@/game/types/GameState";
import { baseUrl } from "@/common/urlUtil";

export type InitResults = {
  gameState:GameState,
  minutes:number
}

export async function init():Promise<InitResults|null> {
  const level = await loadLevelFromUrl(baseUrl('/levels/kingacide.md'));
  const gameState = createGameStateFromLevel(level);
  const minutes = msecsToMinutes(gameState.time);
  return {
    gameState,
    minutes
  }
}