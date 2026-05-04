import { MSECS_IN_MINUTE } from "@/common/timeUtil";
import { createGameStateFromLevel } from "@/game/gameUtil";
import { createExampleLevel } from "@/game/levelUtil";
import GameState from "@/game/types/GameState";

export type InitResults = {
  gameState:GameState,
  minutes:number
}

export async function init():Promise<InitResults|null> {
  const level = createExampleLevel();
  const gameState = createGameStateFromLevel(level);
  const minutes = Math.floor(gameState.time / MSECS_IN_MINUTE);
  return {
    gameState,
    minutes
  }
}