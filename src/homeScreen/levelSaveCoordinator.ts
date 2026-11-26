/* This file coordinates persistent world changes and progress saves for one active level.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { urlToFilename } from '@/common/urlUtil';
import { createLevelSaveState } from '@/game/levelSaveStateUtil';
import GameState from '@/game/types/GameState';
import { completeLevel, revealAllCharacterTitles, revealRooms } from '@/game/worldProgressUtil';
import { popLevelChanges } from '@/persistence/levelChangeQueue';
import { clearLevelSaveState, setLevelSaveState } from '@/persistence/levelSaveState';
import LevelChange from '@/persistence/types/LevelChange';
import LevelSaveState from '@/persistence/types/LevelSaveState';

class LevelSaveCoordinator {
  private readonly _levelUrl:string;
  private readonly _levelFilename:string;
  private readonly _gameState:GameState;
  private _committedTime:number;
  private _lastObservedTime:number;
  private _wasPlaying:boolean;
  private _pausedTimeTimer:ReturnType<typeof setTimeout>|null = null;
  private _lastSubmittedKey:string;
  private _pending:Promise<void> = Promise.resolve();
  private _isStopped = false;
  private _pendingPop:Promise<void>|null = null;
  private _stagedChanges:LevelChange[] = [];
  private _popFailed = false;
  private _settling:Promise<void>|null = null;

  /** Establishes the restored baseline, optionally submitting fresh initial progress once. */
  constructor(levelUrl:string, gameState:GameState, needsInitialSave:boolean = false,
    private readonly _onStorageError?:(message:string) => void) {
    this._levelUrl = levelUrl;
    this._levelFilename = urlToFilename(levelUrl);
    this._gameState = gameState;
    this._committedTime = gameState.time;
    this._lastObservedTime = gameState.time;
    this._wasPlaying = gameState.isPlaying;
    const initialSave = createLevelSaveState(gameState, this._committedTime);
    this._lastSubmittedKey = JSON.stringify(initialSave);
    if (needsInitialSave) this._submit(initialSave);
  }

  private _submit(save:LevelSaveState):void {
    this._pending = this._pending.then(() => setLevelSaveState(this._levelFilename, save)).catch(error => {
      this._reportStorageError(`Unable to save progress for "${this._levelUrl}".`, error);
    });
  }

  private _reportStorageError(message:string, error:unknown):void {
    console.error(message, error);
    this._onStorageError?.(message);
  }

  private _applyStagedChanges():boolean {
    const changes = this._stagedChanges;
    this._stagedChanges = [];
    for (const change of changes) {
      switch (change.kind) {
        case 'revealRoom': revealRooms(this._gameState, change.roomIds); break;
        case 'revealCharacterTitles': revealAllCharacterTitles(this._gameState); break;
        case 'setLevelComplete': completeLevel(this._gameState); break;
      }
    }
    return changes.length > 0;
  }

  beforeFrame():void {
    if (this._isStopped) return;
    this._applyStagedChanges();
    if (this._pendingPop || this._popFailed) return;
    this._pendingPop = popLevelChanges(this._levelFilename).then(changes => {
      this._stagedChanges = changes;
    }, error => {
      this._popFailed = true;
      this._reportStorageError(`Unable to read pending changes for "${this._levelUrl}".`, error);
    }).finally(() => { this._pendingPop = null; });
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
    if (this._settling) return this._settling;
    const shouldFlush = flushPausedTime && this._pausedTimeTimer !== null;
    this._cancelPausedTime();
    this._isStopped = true;
    const finish = () => {
      const appliedChanges = this._applyStagedChanges();
      if (shouldFlush && !this._gameState.isPlaying) this._commitPausedTime();
      else if (appliedChanges) this._saveProgress();
      return this._pending;
    };
    this._settling = this._pendingPop ? this._pendingPop.then(finish) : finish();
    return this._settling;
  }

  /** Cancels delayed saves and clears this level only after earlier writes have settled. */
  async clearSaveAfterSettling():Promise<void> {
    await this.stopAndSettle();
    await clearLevelSaveState(this._levelFilename);
  }
}

export default LevelSaveCoordinator;