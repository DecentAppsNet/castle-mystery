/* This module groups home-screen initialization helpers that load the selected level and create initial runtime state.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { msecsToMinutes } from '@/common/timeUtil';
import { prepareLevelState } from '../levelPreparation';
import { updateImageSetForLevel } from "@/game/imageSetUtil";
import { loadLevelFromUrl, loadLevelManifestFromUrl } from "@/levelLoading";
import { ImageSet } from '@/imageLoading';
import InitResults from '../types/InitResults';

/** Loads the initial level and prepares runtime state with the supplied session image store. */
export async function init(imageSet:ImageSet):Promise<InitResults> {
  const levelManifest = await loadLevelManifestFromUrl('/levels/levels.md');
  const initialLevelUrl = levelManifest.levelUrls[levelManifest.lastLevelI] ?? levelManifest.levelUrls[0];
  const { level, errors } = await loadLevelFromUrl(initialLevelUrl);
  if (!level) {
    console.error(errors.describeErrors());
    throw new Error('Level could not be loaded due to errors. See console for details.');
  }
  await updateImageSetForLevel(level, imageSet);
  const prepared = await prepareLevelState(level, imageSet, initialLevelUrl);
  const { gameState } = prepared;
  const minutes = msecsToMinutes(gameState.time);
  return {
    ...prepared,
    minutes,
    levelManifest
  };
}
