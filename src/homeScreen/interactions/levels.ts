/* This module groups home-screen level-switching helpers that load, apply, and persist selected levels.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import type { Dispatch, SetStateAction } from "react";

import { createDiscoveries } from "@/game/discoveriesUtil";
import { prepareLevelState } from '../levelPreparation';
import { updateImageSetForLevel } from "@/game/imageSetUtil";
import { ImageSet } from '@/imageLoading';
import Discoveries from "@/game/types/Discoveries";
import PreparedLevelState from '../types/PreparedLevelState';
import Conclusion from "@/game/conclusions/types/Conclusion";
import { loadLevelFromUrl } from "@/levelLoading";
import { setLastLevelUrl } from "@/persistence/lastLevel";
import { msecsToMinutes } from '@/common/timeUtil';
import type LevelLoadRequest from '../types/LevelLoadRequest';
import LevelSaveCoordinator from '../levelSaveCoordinator';
import { assertNonNullable } from 'decent-portal';

type ChangeLevelParams = {
  imageSet:ImageSet,
  loadRequest:LevelLoadRequest,
  saveCoordinator:LevelSaveCoordinator|null,
  closeCurtain:() => Promise<boolean>,
  onLoadingFailed:(error:unknown) => void,
  levelUrl:string,
  onLevelPrepared:(prepared:PreparedLevelState) => void,
  setIsPlaying:Dispatch<SetStateAction<boolean>>,
  setMinutes:Dispatch<SetStateAction<number>>,
  setWinSynopsis:Dispatch<SetStateAction<string>>,
  setConclusions:Dispatch<SetStateAction<Conclusion[]>>,
  setDiscoveries:Dispatch<SetStateAction<Discoveries>>,
  setConclusionClaimCooldowns:Dispatch<SetStateAction<Record<string, number>>>,
  setActiveCharacterId:Dispatch<SetStateAction<string>>,
  setModalDialogName:Dispatch<SetStateAction<string|null>>
};

async function _loadAndApplyLevel(levelUrl:string, onLevelPrepared:(prepared:PreparedLevelState) => void,
  setIsPlaying:Dispatch<SetStateAction<boolean>>, setMinutes:Dispatch<SetStateAction<number>>,
  setWinSynopsis:Dispatch<SetStateAction<string>>, setConclusions:Dispatch<SetStateAction<Conclusion[]>>, setDiscoveries:Dispatch<SetStateAction<Discoveries>>,
  setConclusionClaimCooldowns:Dispatch<SetStateAction<Record<string, number>>>, setActiveCharacterId:Dispatch<SetStateAction<string>>,
  setModalDialogName:Dispatch<SetStateAction<string|null>>, loadRequest:LevelLoadRequest, imageSet:ImageSet):Promise<void> {
  
  const { level, errors } = await loadLevelFromUrl(levelUrl);
  if (!level) {
    console.error(errors.describeErrors());
    throw new Error('Failed to load level. See console for details.');
  }
  await updateImageSetForLevel(level, imageSet);
  if (!loadRequest.isMounted) return;
  const prepared = await prepareLevelState(level, imageSet, levelUrl);
  if (!loadRequest.isMounted) return;

  const { gameState } = prepared;
  onLevelPrepared(prepared);
  setIsPlaying(false);
  setMinutes(msecsToMinutes(gameState.time));
  setWinSynopsis(gameState.winSynopsis);
  setConclusions(gameState.conclusions);
  setDiscoveries(createDiscoveries(gameState));
  setConclusionClaimCooldowns({});
  setActiveCharacterId(gameState.activeCharacterId);
  setModalDialogName(null);

  await setLastLevelUrl(levelUrl);
}

/** Reuses the active request and ignores additional selections until close/load/apply settles. */
function _requestLevelLoad(loadRequest:LevelLoadRequest, closeCurtain:() => Promise<boolean>,
  load:() => Promise<void>, onLoadingFailed:(error:unknown) => void,
  saveCoordinator:LevelSaveCoordinator|null, resetSave:boolean):Promise<void> {
  if (loadRequest.pending) return loadRequest.pending;
  if (!loadRequest.isMounted) return Promise.resolve();

  // Store the request before closure can notify completion.
  loadRequest.pending = Promise.resolve().then(async () => {
    try {
      if (!await closeCurtain() || !loadRequest.isMounted) return;

      // Finish outgoing storage before any target read, including same-level re-entry.
      if (resetSave) {
        assertNonNullable(saveCoordinator);
        await saveCoordinator.clearSaveAfterSettling();
      } else await saveCoordinator?.stopAndSettle(true);
      if (!loadRequest.isMounted) return;

      // A failed load leaves the outgoing coordinator stopped behind the closed curtain.
      await load();
    } catch (error:unknown) {
      if (!loadRequest.isMounted) return;
      console.error(error);
      onLoadingFailed(error);
    }
  }).finally(() => { loadRequest.pending = null; });
  return loadRequest.pending;
}

/** Runs selection and Reset through the same protected close/save/load lifecycle. */
function _changeLevel({
  imageSet,
  loadRequest,
  saveCoordinator,
  closeCurtain,
  onLoadingFailed,
  levelUrl,
  onLevelPrepared,
  setIsPlaying,
  setMinutes,
  setWinSynopsis,
  setConclusions,
  setDiscoveries,
  setConclusionClaimCooldowns,
  setActiveCharacterId,
  setModalDialogName
}:ChangeLevelParams, resetSave:boolean):Promise<void> {
  return _requestLevelLoad(loadRequest, closeCurtain, () => _loadAndApplyLevel(levelUrl, onLevelPrepared, setIsPlaying, setMinutes,
    setWinSynopsis, setConclusions, setDiscoveries, setConclusionClaimCooldowns, setActiveCharacterId,
    setModalDialogName, loadRequest, imageSet), onLoadingFailed, saveCoordinator, resetSave);
}

type ContinueToNextLevelParams = ChangeLevelParams & { levelUrls:readonly string[] };

/** Handles level selection, flushing outgoing paused time before loading the target. */
export function changeLevel(params:ChangeLevelParams):Promise<void> {
  return _changeLevel(params, false);
}

/** Handles Reset by clearing current progress before reloading the same level. */
export function resetLevel(params:ChangeLevelParams):Promise<void> {
  return _changeLevel(params, true);
}

/** Handles Continue from the victory dialog; no next level only dismisses the dialog. */
export function continueToNextLevel(params:ContinueToNextLevelParams):Promise<void> {
  const { levelUrl, levelUrls, ...changeParams } = params;
  const levelI = levelUrls.indexOf(levelUrl);
  const nextLevelUrl = levelI === -1 ? undefined : levelUrls[levelI + 1];
  if (!nextLevelUrl) {
    changeParams.setModalDialogName(null);
    return Promise.resolve();
  }

  return changeLevel({ ...changeParams, levelUrl:nextLevelUrl });
}