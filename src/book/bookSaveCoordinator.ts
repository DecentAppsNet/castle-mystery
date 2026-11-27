/* This file coordinates snapshot capture and persistent writes for one book session.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { setBookSaveState } from '@/persistence/bookSaveState';
import { encodeBookSaveState } from './codec';
import BookState from './types/BookState';

const SAVE_DELAY_MS = 3000;
const STABILITY_RECHECK_MS = 50;

function _isBookStable(book:Readonly<BookState>):boolean {
  if (book.pieceDragState !== null) return false;
  const { claimState } = book;
  if (!claimState || claimState.publication === 'failed') return true;
  return claimState.publication !== 'pending' && claimState.resultApplied
    && (claimState.correct || claimState.ejectedCount === claimState.blanks.length);
}

class BookSaveCoordinator {
  private _timer:ReturnType<typeof setTimeout>|null = null;
  private _hasImmediateRequest = false;
  private _isStopped = false;
  private _pending:Promise<void> = Promise.resolve();

  constructor(private readonly _bookUrl:string, private readonly _book:Readonly<BookState>,
    private readonly _protectUnsupportedVersion:boolean, private readonly _onStorageError:(message:string) => void) {}

  private _cancelTimer():void {
    if (this._timer !== null) clearTimeout(this._timer);
    this._timer = null;
  }

  private _scheduleCapture(delay:number):void {
    this._cancelTimer();
    this._timer = setTimeout(() => this._capture(), delay);
  }

  private _capture():void {
    this._cancelTimer();
    if (!_isBookStable(this._book)) {
      this._scheduleCapture(STABILITY_RECHECK_MS);
      return;
    }

    this._hasImmediateRequest = false;
    const snapshot = encodeBookSaveState(this._book);
    this._pending = this._pending.then(() => setBookSaveState(this._bookUrl, snapshot)).catch(error => {
      const message = `Unable to save book progress for "${this._bookUrl}".`;
      console.error(message, error);
      this._onStorageError(message);
    });
  }

  requestDebouncedSave():void {
    if (this._isStopped || this._protectUnsupportedVersion || this._hasImmediateRequest) return;
    this._scheduleCapture(SAVE_DELAY_MS);
  }

  requestImmediateSave():void {
    if (this._isStopped || this._protectUnsupportedVersion) return;
    this._hasImmediateRequest = true;
    this._capture();
  }

  stopAndSettle():Promise<void> {
    this._isStopped = true;
    this._cancelTimer();
    return this._pending;
  }
}

export default BookSaveCoordinator;