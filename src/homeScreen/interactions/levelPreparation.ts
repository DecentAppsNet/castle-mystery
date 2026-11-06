/* This file prepares freshly loaded game state with compatible persistent progress before publication.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { createGameState } from '@/game/gameUtil';
import { isLevelSaveStateCompatible, restoreGameStateFromSave } from '@/game/levelSaveStateUtil';
import ImageSet from '@/game/types/ImageSet';
import Level from '@/game/types/Level';
import { clearLevelSaveState, getLevelSaveState } from '@/persistence/levelSaveState';
import PreparedLevelState from '../types/PreparedLevelState';

/** Creates paused state and restores compatible progress, treating storage failures as unavailable saves. */
export async function prepareLevelState(level:Level, imageSet:ImageSet, levelUrl:string):Promise<PreparedLevelState> {
  // Construct outside storage error handling so game construction failures remain visible.
  const gameState = createGameState(level, imageSet);
  const save = await getLevelSaveState(levelUrl).catch(error => {
    console.error(`Unable to read level save for "${levelUrl}". Using fresh progress.`, error);
    return null;
  });

  // Clear incompatible records without letting unavailable storage fail the level load.
  if (save && !isLevelSaveStateCompatible(save, gameState)) {
    await clearLevelSaveState(levelUrl).catch(error => {
      console.error(`Unable to clear incompatible level save for "${levelUrl}".`, error);
    });
    return { gameState, levelUrl, needsInitialSave:true };
  }

  // Restore before callers can publish state or begin observing it for autosave.
  if (save) restoreGameStateFromSave(gameState, save);
  return { gameState, levelUrl, needsInitialSave:save === null };
}