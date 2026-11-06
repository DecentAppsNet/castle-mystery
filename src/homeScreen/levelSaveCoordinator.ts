/* This file coordinates immutable, ordered progress saves for one active level.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { createLevelSaveState } from '@/game/levelSaveStateUtil';
import GameState from '@/game/types/GameState';
import { setLevelSaveState } from '@/persistence/levelSaveState';
import LevelSaveState from '@/persistence/types/LevelSaveState';

class LevelSaveCoordinator {
  private readonly _levelUrl:string;
  private readonly _gameState:GameState;
  private _committedTime:number;
  private _lastObservedTime:number;
  private _wasPlaying:boolean;
  private _pausedTimeTimer:ReturnType<typeof setTimeout>|null = null;
  private _lastSubmittedKey:string;
  private _pending:Promise<void> = Promise.resolve();
  private _isStopped = false;

  /** Establishes the restored baseline, optionally submitting fresh initial progress once. */
  constructor(levelUrl:string, gameState:GameState, needsInitialSave:boolean = false) {
    this._levelUrl = levelUrl;
    this._gameState = gameState;
    this._committedTime = gameState.time;
    this._lastObservedTime = gameState.time;
    this._wasPlaying = gameState.isPlaying;
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

  private _cancelPausedTime():void {
    if (this._pausedTimeTimer !== null) clearTimeout(this._pausedTimeTimer);
    this._pausedTimeTimer = null;
  }

  private _commitPausedTime():void {
    this._cancelPausedTime();
    if (this._gameState.isPlaying) return;
    this._committedTime = this._gameState.time;
    this._saveProgress();
  }

  private _saveProgress():void {
    const save = createLevelSaveState(this._gameState, this._committedTime);
    const key = JSON.stringify(save);
    if (key === this._lastSubmittedKey) return;

    // Snapshot creation happens before queuing, so later mutations cannot change this write.
    this._lastSubmittedKey = key;
    this._submit(save);
  }

  /** Saves changed progress immediately and debounces paused time, including entry into pause. */
  observe():void {
    // Stopped coordinators ignore stale callbacks from outgoing gameplay.
    if (this._isStopped) return;
    const { time, isPlaying } = this._gameState;
    if (isPlaying) this._cancelPausedTime();
    else if (this._wasPlaying || time !== this._lastObservedTime) {
      this._cancelPausedTime();
      this._pausedTimeTimer = setTimeout(() => this._commitPausedTime(), 3000);
    }

    // Progress-only changes must not restart the timer or bypass committed time.
    this._lastObservedTime = time;
    this._wasPlaying = isPlaying;
    this._saveProgress();
  }

  /** Stops submissions and settles writes; transitions flush pending paused time, Reset cancels it. */
  stopAndSettle(flushPausedTime:boolean = false):Promise<void> {
    if (!this._isStopped && flushPausedTime && this._pausedTimeTimer !== null) this._commitPausedTime();
    this._cancelPausedTime();
    this._isStopped = true;
    return this._pending;
  }
}

export default LevelSaveCoordinator;