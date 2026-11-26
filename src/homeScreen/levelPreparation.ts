/* This file prepares freshly loaded game state with persistent progress and commits image retention at acceptance.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { urlToFilename } from '@/common/urlUtil';
import { createGameState } from '@/game/gameUtil';
import { isLevelSaveStateCompatible, restoreGameStateFromSave } from '@/game/levelSaveStateUtil';
import { ImageSet, removeUnrequiredImagesForLevel } from '@/imageLoading';
import Level from '@/levelLoading/types/Level';
import { clearLevelSaveState, getLevelSaveState } from '@/persistence/levelSaveState';
import PreparedLevelState from './types/PreparedLevelState';

/** Call only after preparation succeeds and the closed curtain has stopped outgoing rendering. */
export function acceptPreparedLevelState(prepared:PreparedLevelState, bookImageUrls:ReadonlySet<string>):void {
  removeUnrequiredImagesForLevel(prepared.level, prepared.gameState.imageSet, bookImageUrls);
}

/** Creates paused state and restores compatible progress, treating storage failures as unavailable saves. */
export async function prepareLevelState(level:Level, imageSet:ImageSet, levelUrl:string):Promise<PreparedLevelState> {
  // Construct outside storage error handling so game construction failures remain visible.
  const gameState = createGameState(level, imageSet);
  const levelFilename = urlToFilename(levelUrl);
  const save = await getLevelSaveState(levelFilename).catch(error => {
    console.error(`Unable to read level save for "${levelUrl}". Using fresh progress.`, error);
    return null;
  });

  // Clear incompatible records without letting unavailable storage fail the level load.
  if (save && !isLevelSaveStateCompatible(save, gameState)) {
    await clearLevelSaveState(levelFilename).catch(error => {
      console.error(`Unable to clear incompatible level save for "${levelUrl}".`, error);
    });
    return { level, gameState, levelUrl, needsInitialSave:true };
  }

  // Restore before callers can publish state or begin observing it for autosave.
  if (save) restoreGameStateFromSave(gameState, save);
  return { level, gameState, levelUrl, needsInitialSave:save === null };
}