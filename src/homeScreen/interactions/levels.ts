import type { Dispatch, SetStateAction } from "react";

import { createGameState } from "@/game/gameUtil";
import { createImageSetFromLevel } from "@/game/imageSetUtil";
import GameState from "@/game/types/GameState";
import Solution from "@/game/solutions/types/Solution";
import { loadLevelFromUrl } from "@/levelLoading/levelUtil";
import { setLastLevelUrl } from "@/persistence/lastLevel";
import { msecsToMinutes } from "./gameplay";

type ChangeLevelParams = {
  levelUrl:string,
  setGameState:Dispatch<SetStateAction<GameState|null>>,
  setIsPlaying:Dispatch<SetStateAction<boolean>>,
  setMinutes:Dispatch<SetStateAction<number>>,
  setWinSynopsis:Dispatch<SetStateAction<string>>,
  setSolutions:Dispatch<SetStateAction<Solution[]>>,
  setSolutionClaimCooldowns:Dispatch<SetStateAction<Record<string, number>>>,
  setActiveCharacterId:Dispatch<SetStateAction<string>>,
  setIsScrubbing:Dispatch<SetStateAction<boolean>>,
  setModalDialogName:Dispatch<SetStateAction<string|null>>,
  winLevelDialogName:string
};

export async function changeLevel({
  levelUrl,
  setGameState,
  setIsPlaying,
  setMinutes,
  setWinSynopsis,
  setSolutions,
  setSolutionClaimCooldowns,
  setActiveCharacterId,
  setIsScrubbing,
  setModalDialogName,
  winLevelDialogName
}:ChangeLevelParams):Promise<void> {
  const level = await loadLevelFromUrl(levelUrl);
  const imageSet = await createImageSetFromLevel(level);
  const gameState = createGameState(level, imageSet);

  setGameState(gameState);
  setIsPlaying(false);
  setMinutes(msecsToMinutes(gameState.time));
  setWinSynopsis(gameState.winSynopsis);
  setSolutions(gameState.solutions);
  setSolutionClaimCooldowns({});
  setActiveCharacterId(gameState.characters[gameState.activeCharacterI]?.id || "");
  setIsScrubbing(false);
  setModalDialogName(gameState.isLevelComplete ? winLevelDialogName : null);

  await setLastLevelUrl(levelUrl);
}