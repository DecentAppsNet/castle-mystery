import { msecsToMinutes } from "./gameplay";
import { createGameStateFromLevel } from "@/game/gameUtil";
import { createExampleLevel } from "@/game/levelUtil";
import GameState from "@/game/types/GameState";
import { MSECS_IN_DAY } from "@/common/timeUtil";

export type InitResults = {
  gameState:GameState,
  minutes:number
}

export async function init():Promise<InitResults|null> {
  const level = createExampleLevel(MSECS_IN_DAY);
  const gameState = createGameStateFromLevel(level);
  const minutes = msecsToMinutes(gameState.time);
  return {
    gameState,
    minutes
  }
}