import { createExampleLevel } from "@/game/levelUtil";
import Level from "@/game/types/Level";

export type InitResults = {
  level:Level
}

export async function init():Promise<InitResults|null> {
  const level = createExampleLevel();
  return {
    level
  }
}