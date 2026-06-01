import type { Dispatch, SetStateAction } from "react";

import { createGameState } from "@/game/gameUtil";
import { createImageSetFromLevel } from "@/game/imageSetUtil";
import GameState from "@/game/types/GameState";
import Solution from "@/game/solutions/types/Solution";
import { loadLevelFromUrl } from "@/levelLoading/levelUtil";
import LevelManifest from "@/levelLoading/types/LevelManifest";
import { setLastLevelUrl } from "@/persistence/lastLevel";
import { msecsToMinutes } from "./gameplay";
import WinLevelDialog from "../dialogs/WinLevelDialog";

type ChangeLevelParams = {
  levelUrl:string,
  levelManifest:LevelManifest,
  setGameState:Dispatch<SetStateAction<GameState|null>>,
  setLevelManifest:Dispatch<SetStateAction<LevelManifest|null>>,
  setIsPlaying:Dispatch<SetStateAction<boolean>>,
  setMinutes:Dispatch<SetStateAction<number>>,
  setWinSynopsis:Dispatch<SetStateAction<string>>,
  setSolutions:Dispatch<SetStateAction<Solution[]>>,
  setSolutionClaimCooldowns:Dispatch<SetStateAction<Record<string, number>>>,
  setActiveCharacterId:Dispatch<SetStateAction<string>>,
  setIsScrubbing:Dispatch<SetStateAction<boolean>>,
  setModalDialogName:Dispatch<SetStateAction<string|null>>
};

function _findLevelIndex(levelManifest:LevelManifest, levelUrl:string):number {
  const levelIndex = levelManifest.levelUrls.indexOf(levelUrl);
  return levelIndex === -1 ? 0 : levelIndex;
}

function _createLevelManifestWithSelectedLevel(levelManifest:LevelManifest, levelUrl:string):LevelManifest {
  return {
    ...levelManifest,
    lastLevelI:_findLevelIndex(levelManifest, levelUrl)
  };
}

async function _loadAndApplyLevel(levelUrl:string, levelManifest:LevelManifest,
  setGameState:Dispatch<SetStateAction<GameState|null>>, setLevelManifest:Dispatch<SetStateAction<LevelManifest|null>>,
  setIsPlaying:Dispatch<SetStateAction<boolean>>, setMinutes:Dispatch<SetStateAction<number>>,
  setWinSynopsis:Dispatch<SetStateAction<string>>, setSolutions:Dispatch<SetStateAction<Solution[]>>,
  setSolutionClaimCooldowns:Dispatch<SetStateAction<Record<string, number>>>, setActiveCharacterId:Dispatch<SetStateAction<string>>,
  setIsScrubbing:Dispatch<SetStateAction<boolean>>, setModalDialogName:Dispatch<SetStateAction<string|null>>):Promise<void> {
  const level = await loadLevelFromUrl(levelUrl);
  const imageSet = await createImageSetFromLevel(level);
  const gameState = createGameState(level, imageSet);

  setGameState(gameState);
  setLevelManifest(_createLevelManifestWithSelectedLevel(levelManifest, levelUrl));
  setIsPlaying(false);
  setMinutes(msecsToMinutes(gameState.time));
  setWinSynopsis(gameState.winSynopsis);
  setSolutions(gameState.solutions);
  setSolutionClaimCooldowns({});
  setActiveCharacterId(gameState.characters[gameState.activeCharacterI]?.id || "");
  setIsScrubbing(false);
  setModalDialogName(gameState.isLevelComplete ? WinLevelDialog.name : null);

  await setLastLevelUrl(levelUrl);
}

export async function changeLevel({
  levelUrl,
  levelManifest,
  setGameState,
  setLevelManifest,
  setIsPlaying,
  setMinutes,
  setWinSynopsis,
  setSolutions,
  setSolutionClaimCooldowns,
  setActiveCharacterId,
  setIsScrubbing,
  setModalDialogName
}:ChangeLevelParams):Promise<void> {
  await _loadAndApplyLevel(levelUrl, levelManifest, setGameState, setLevelManifest, setIsPlaying, setMinutes,
    setWinSynopsis, setSolutions, setSolutionClaimCooldowns, setActiveCharacterId, setIsScrubbing,
    setModalDialogName);
}

type ContinueToNextLevelParams = Omit<ChangeLevelParams, 'levelUrl'>;

export async function continueToNextLevel({
  levelManifest,
  setGameState,
  setLevelManifest,
  setIsPlaying,
  setMinutes,
  setWinSynopsis,
  setSolutions,
  setSolutionClaimCooldowns,
  setActiveCharacterId,
  setIsScrubbing,
  setModalDialogName
}:ContinueToNextLevelParams):Promise<void> {
  const nextLevelUrl = levelManifest.levelUrls[levelManifest.lastLevelI + 1] || null;
  if (!nextLevelUrl) {
    setModalDialogName(null);
    return;
  }

  await _loadAndApplyLevel(nextLevelUrl, levelManifest, setGameState, setLevelManifest, setIsPlaying, setMinutes,
    setWinSynopsis, setSolutions, setSolutionClaimCooldowns, setActiveCharacterId, setIsScrubbing,
    setModalDialogName);
}