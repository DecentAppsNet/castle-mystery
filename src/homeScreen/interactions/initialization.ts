import { MSECS_IN_MINUTE } from "@/common/timeUtil";
import { createExampleLevel } from "@/game/levelUtil";
import Level from "@/game/types/Level";

export type InitResults = {
  level:Level,
  minutes:number
}

export async function init():Promise<InitResults|null> {
  const level = createExampleLevel();
  const minutes = Math.floor(level.startTime / MSECS_IN_MINUTE);
  return {
    level,
    minutes
  }
}