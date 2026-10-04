/* This module groups home-screen level-switching helpers that load, apply, and persist selected levels.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import type { Dispatch, SetStateAction } from "react";

import { createDiscoveries } from "@/game/discoveriesUtil";
import { createGameState } from "@/game/gameUtil";
import { createImageSetFromLevel } from "@/game/imageSetUtil";
import Discoveries from "@/game/types/Discoveries";
import GameState from "@/game/types/GameState";
import Conclusion from "@/game/conclusions/types/Conclusion";
import { loadLevelFromUrl } from "@/levelLoading";
import LevelManifest from "@/levelLoading/types/LevelManifest";
import { setLastLevelUrl } from "@/persistence/lastLevel";
import { msecsToMinutes } from "./gameplay";
import WinLevelDialog from "../dialogs/WinLevelDialog";
import type LevelLoadRequest from '../types/LevelLoadRequest';

type ChangeLevelParams = {
  loadRequest:LevelLoadRequest,
  closeCurtain:() => Promise<boolean>,
  onLoadingFailed:(error:unknown) => void,
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
  setModalDialogName:Dispatch<SetStateAction<string|null>>, loadRequest:LevelLoadRequest):Promise<void> {
  
  const { level, errors } = await loadLevelFromUrl(levelUrl);
  if (!level) {
    console.error(errors.describeErrors());
    throw new Error('Failed to load level. See console for details.');
  }
  const imageSet = await createImageSetFromLevel(level);
  if (!loadRequest.isMounted) return;
  const gameState = createGameState(level, imageSet);

  setGameState(gameState);
  setLevelManifest(_createLevelManifestWithSelectedLevel(levelManifest, levelUrl));
  setIsPlaying(false);
  setMinutes(msecsToMinutes(gameState.time));
  setWinSynopsis(gameState.winSynopsis);
  setConclusions(gameState.conclusions);
  setDiscoveries(createDiscoveries(gameState));
  setConclusionClaimCooldowns({});
  setActiveCharacterId(gameState.activeCharacterId);
  setModalDialogName(gameState.isLevelComplete ? WinLevelDialog.name : null);

  await setLastLevelUrl(levelUrl);
}

/** Reuses the active request and ignores additional selections until close/load/apply settles. */
function _requestLevelLoad(loadRequest:LevelLoadRequest, closeCurtain:() => Promise<boolean>,
  load:() => Promise<void>, onLoadingFailed:(error:unknown) => void):Promise<void> {
  if (loadRequest.pending) return loadRequest.pending;
  if (!loadRequest.isMounted) return Promise.resolve();

  // Store the request before closure can notify completion.
  loadRequest.pending = Promise.resolve().then(async () => {
    try {
      if (!await closeCurtain() || !loadRequest.isMounted) return;
      await load();
    } catch (error:unknown) {
      if (!loadRequest.isMounted) return;
      console.error(error);
      onLoadingFailed(error);
    }
  }).finally(() => { loadRequest.pending = null; });
  return loadRequest.pending;
}

/** Closes the curtain before fetching, then applies a replacement without changing gameplay reset semantics. */
export function changeLevel({
  loadRequest,
  closeCurtain,
  onLoadingFailed,
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
  setModalDialogName
}:ChangeLevelParams):Promise<void> {
  return _requestLevelLoad(loadRequest, closeCurtain, () => _loadAndApplyLevel(levelUrl, levelManifest, setGameState, setLevelManifest, setIsPlaying, setMinutes,
    setWinSynopsis, setConclusions, setDiscoveries, setConclusionClaimCooldowns, setActiveCharacterId,
    setModalDialogName, loadRequest), onLoadingFailed);
}

type ContinueToNextLevelParams = Omit<ChangeLevelParams, 'levelUrl'>;

/** Resolves next-level availability before closure; no next level only dismisses the dialog. */
export function continueToNextLevel(params:ContinueToNextLevelParams):Promise<void> {
  const { levelManifest, setModalDialogName } = params;
  const nextLevelUrl = levelManifest.levelUrls[levelManifest.lastLevelI + 1] || null;
  if (!nextLevelUrl) {
    setModalDialogName(null);
    return Promise.resolve();
  }

  return changeLevel({ ...params, levelUrl:nextLevelUrl });
}