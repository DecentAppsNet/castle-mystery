/* This file coordinates immutable, ordered progress saves for one active level.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { createLevelSaveState } from '@/game/levelSaveStateUtil';
import GameState from '@/game/types/GameState';
import { setLevelSaveState } from '@/persistence/levelSaveState';
import LevelSaveState from '@/persistence/types/LevelSaveState';

class LevelSaveCoordinator {
  private readonly _levelUrl:string;
  private readonly _gameState:GameState;
  private readonly _committedTime:number;
  private _lastSubmittedKey:string;
  private _pending:Promise<void> = Promise.resolve();
  private _isStopped = false;

  /** Establishes the restored baseline, optionally submitting fresh initial progress once. */
  constructor(levelUrl:string, gameState:GameState, needsInitialSave:boolean = false) {
    this._levelUrl = levelUrl;
    this._gameState = gameState;
    this._committedTime = gameState.time;
    const initialSave = createLevelSaveState(gameState, this._committedTime);
    this._lastSubmittedKey = JSON.stringify(initialSave);
    if (needsInitialSave) this._submit(initialSave);
  }

  private _submit(save:LevelSaveState):void {
    const levelUrl = this._levelUrl;
    this._pending = this._pending.then(() => setLevelSaveState(levelUrl, save)).catch(error => {
      console.error(`Unable to save progress for "${levelUrl}".`, error);
    });
  }

  /** Submits changed progress without awaiting storage or copying live playback time. */
  observe():void {
    // Stopped coordinators ignore stale callbacks from outgoing gameplay.
    if (this._isStopped) return;
    const save = createLevelSaveState(this._gameState, this._committedTime);
    const key = JSON.stringify(save);
    if (key === this._lastSubmittedKey) return;

    // Snapshot creation happens before queuing, so later mutations cannot change this write.
    this._lastSubmittedKey = key;
    this._submit(save);
  }

  /** Stops new submissions and waits for all previously queued writes, including failed ones. */
  stopAndSettle():Promise<void> {
    this._isStopped = true;
    return this._pending;
  }
}

export default LevelSaveCoordinator;