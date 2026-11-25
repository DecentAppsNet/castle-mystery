/* This module groups home-screen initialization helpers that load the selected level and create initial runtime state.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { assert } from 'decent-portal';

import { msecsToMinutes } from '@/common/timeUtil';
import { prepareLevelState } from '../levelPreparation';
import { updateImageSetForLevel } from "@/game/imageSetUtil";
import { loadLevelFromUrl, loadLevelManifestFromUrl } from "@/levelLoading";
import { ImageSet } from '@/imageLoading';
import InitResults from '../types/InitResults';
import { loadBookFromUrl } from '@/book';
import BookState from '@/book/types/BookState';
import { getLastLevelUrl } from '@/persistence/lastLevel';

async function _chooseInitialLevelUrl(bookState:BookState):Promise<string> {
  const lastLevelUrl = await getLastLevelUrl(); // This might be a developer-selected level that is not part of the book.
  assert(bookState.levelUrls.length > 0);
  return lastLevelUrl ?? bookState.levelUrls[0];
}

/** Loads the initial level and prepares runtime state with the supplied session image store. */
export async function init(imageSet:ImageSet):Promise<InitResults> {
  const bookState = await loadBookFromUrl('/levels/book.md');
  const levelManifest = await loadLevelManifestFromUrl('/levels/levels.md'); // This is used to populate the dev navigation menu.
  const initialLevelUrl = await _chooseInitialLevelUrl(bookState);
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
    bookState,
    minutes,
    levelManifest
  };
}
