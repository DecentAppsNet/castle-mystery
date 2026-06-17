/* This module groups home-screen level-switching helpers that load, apply, and persist selected levels.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import type { Dispatch, SetStateAction } from "react";

import { createDiscoveries } from "@/game/discoveriesUtil";
import { createGameState } from "@/game/gameUtil";
import { createImageSetFromLevel } from "@/game/imageSetUtil";
import Discoveries from "@/game/types/Discoveries";
import GameState from "@/game/types/GameState";
import Conclusion from "@/game/conclusions/types/Conclusion";
import { loadLevelFromUrl } from "@/levelLoading/levelUtil";
import LevelManifest from "@/levelLoading/types/LevelManifest";
import { setLastLevelUrl } from "@/persistence/lastLevel";
import { endTiming, startTiming } from "@/common/timingPerformanceUtil";
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
  setConclusions:Dispatch<SetStateAction<Conclusion[]>>,
  setDiscoveries:Dispatch<SetStateAction<Discoveries>>,
  setConclusionClaimCooldowns:Dispatch<SetStateAction<Record<string, number>>>,
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
  setWinSynopsis:Dispatch<SetStateAction<string>>, setConclusions:Dispatch<SetStateAction<Conclusion[]>>, setDiscoveries:Dispatch<SetStateAction<Discoveries>>,
  setConclusionClaimCooldowns:Dispatch<SetStateAction<Record<string, number>>>, setActiveCharacterId:Dispatch<SetStateAction<string>>,
  setIsScrubbing:Dispatch<SetStateAction<boolean>>, setModalDialogName:Dispatch<SetStateAction<string|null>>):Promise<void> {
  const levelChangeTiming = `change level (${levelUrl})`;
  startTiming(levelChangeTiming);
  try {
    const level = await loadLevelFromUrl(levelUrl);
    const imageSet = await createImageSetFromLevel(level);
    const gameStateTiming = `game state creation (${levelUrl})`;
    startTiming(gameStateTiming);
    const gameState = createGameState(level, imageSet);
    endTiming(gameStateTiming);

    setGameState(gameState);
    setLevelManifest(_createLevelManifestWithSelectedLevel(levelManifest, levelUrl));
    setIsPlaying(false);
    setMinutes(msecsToMinutes(gameState.time));
    setWinSynopsis(gameState.winSynopsis);
    setConclusions(gameState.conclusions);
    setDiscoveries(createDiscoveries(gameState));
    setConclusionClaimCooldowns({});
    setActiveCharacterId(gameState.characters[gameState.activeCharacterI]?.id || "");
    setIsScrubbing(false);
    setModalDialogName(gameState.isLevelComplete ? WinLevelDialog.name : null);

    await setLastLevelUrl(levelUrl);
  } finally {
    endTiming(levelChangeTiming);
  }
}

export async function changeLevel({
  levelUrl,
  levelManifest,
  setGameState,
  setLevelManifest,
  setIsPlaying,
  setMinutes,
  setWinSynopsis,
  setConclusions,
  setDiscoveries,
  setConclusionClaimCooldowns,
  setActiveCharacterId,
  setIsScrubbing,
  setModalDialogName
}:ChangeLevelParams):Promise<void> {
  await _loadAndApplyLevel(levelUrl, levelManifest, setGameState, setLevelManifest, setIsPlaying, setMinutes,
    setWinSynopsis, setConclusions, setDiscoveries, setConclusionClaimCooldowns, setActiveCharacterId, setIsScrubbing,
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
  setConclusions,
  setDiscoveries,
  setConclusionClaimCooldowns,
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
    setWinSynopsis, setConclusions, setDiscoveries, setConclusionClaimCooldowns, setActiveCharacterId, setIsScrubbing,
    setModalDialogName);
}