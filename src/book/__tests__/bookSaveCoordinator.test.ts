import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ClozeBlank from '@/conclusions/types/ClozeBlank';
import { pathStoreMock } from '@/persistence/__tests__/pathStoreMock';
import { getBookSaveState } from '@/persistence/bookSaveState';
import BookSaveCoordinator from '../bookSaveCoordinator';
import { createDefaultBookState } from '../types/BookState';
import ConclusionPage from '../types/ConclusionPage';

vi.mock('@/persistence/pathStore', async () => {
  const { pathStoreMock } = await import('@/persistence/__tests__/pathStoreMock');
  return pathStoreMock;
});

const bookUrl = '/levels/book.md';

function _createSession(protectUnsupportedVersion:boolean = false, url:string = bookUrl) {
  const book = createDefaultBookState();
  const onStorageError = vi.fn();
  const writer = new BookSaveCoordinator(url, book, protectUnsupportedVersion, onStorageError);
  return { book, writer, onStorageError };
}

describe('BookSaveCoordinator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    pathStoreMock.reset();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('coalesces requests into a save three seconds after the last request', async () => {
    const { book, writer } = _createSession();
    writer.requestDebouncedSave();
    await vi.advanceTimersByTimeAsync(2000);
    book.pageNo = 2;
    writer.requestDebouncedSave();
    await vi.advanceTimersByTimeAsync(2999);
    expect(pathStoreMock.setText).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(pathStoreMock.setText).toHaveBeenCalledOnce();
    await expect(getBookSaveState(bookUrl)).resolves.toMatchObject({ kind:'found', saveState:{ pageNo:2 } });
  });

  it('lets an immediate request absorb pending debounce work', async () => {
    const { book, writer } = _createSession();
    book.pageNo = 2;
    writer.requestDebouncedSave();
    writer.requestImmediateSave();
    await vi.advanceTimersByTimeAsync(0);
    await expect(getBookSaveState(bookUrl)).resolves.toMatchObject({ kind:'found', saveState:{ pageNo:2 } });
    await vi.advanceTimersByTimeAsync(3000);
    expect(pathStoreMock.setText).toHaveBeenCalledOnce();
  });

  it('writes detached snapshots in capture order even when storage is slow', async () => {
    const { book, writer } = _createSession();
    const firstWrite = Promise.withResolvers<void>();
    pathStoreMock.setText.mockReturnValueOnce(firstWrite.promise);
    writer.requestImmediateSave();
    book.levelUrls.push('/levels/another.md');
    writer.requestImmediateSave();
    book.levelUrls.push('/levels/not-saved.md');
    await vi.advanceTimersByTimeAsync(0);
    expect(pathStoreMock.setText).toHaveBeenCalledOnce();
    expect(JSON.parse(pathStoreMock.setText.mock.calls[0][1] ?? '')).toMatchObject({ levelUrls:[] });
    firstWrite.resolve();
    await writer.stopAndSettle();
    expect(pathStoreMock.setText).toHaveBeenCalledTimes(2);
    await expect(getBookSaveState(bookUrl)).resolves.toMatchObject({ kind:'found',
      saveState:{ levelUrls:['/levels/another.md'] } });
  });

  it('defers a due save during a drag and resumes after the drag ends', async () => {
    const { book, writer } = _createSession();
    const piece = { kind:'note' as const, pageI:0, styleNo:0, text:'Note', xPercent:0, yPercent:0 };
    book.pieceStack.push(piece);
    writer.requestDebouncedSave();
    book.pieceDragState = { piece, initialPiece:{ ...piece }, initialStackI:0, grabOffset:[0, 0], extractedAppearance:null };
    await vi.advanceTimersByTimeAsync(3100);
    expect(pathStoreMock.setText).not.toHaveBeenCalled();
    piece.xPercent = 20;
    book.pieceDragState = null;
    await vi.advanceTimersByTimeAsync(100);
    await expect(getBookSaveState(bookUrl)).resolves.toMatchObject({ kind:'found', saveState:{ pieceStack:[{ xPercent:20 }] } });
  });

  it('defers immediate capture until all incorrect-claim ejections settle', async () => {
    const { book, writer } = _createSession();
    const page = { kind:'conclusion', chapterNo:1, headingText:'Claim', levelUrl:'/levels/first.md',
      conclusion:{ id:'claim', title:'Claim', parts:[], isComplete:false, isLocked:false, isOptional:false,
        incorrectGuessCount:1, unlockConclusionIds:[], revealRoomIds:[] },
      layoutTweaks:[], answerSetIdToPieceStyleNoMap:{} } satisfies ConclusionPage;
    const blank: ClozeBlank = { type:'blank', answerSet:{ id:'items', sourceCategoryId:'items', answers:['Key'] },
      correctAnswerIndexes:[0], playerAnswerIndex:-1 };
    const claim = { conclusionPageI:0, page, blanks:[blank, blank], startedAt:0, resultApplied:true, correct:false, ejectedCount:1 };
    book.pages.push(page);
    book.claimState = claim;
    writer.requestImmediateSave();
    await vi.advanceTimersByTimeAsync(500);
    expect(pathStoreMock.setText).not.toHaveBeenCalled();
    claim.ejectedCount = 2;
    writer.requestDebouncedSave();
    await vi.advanceTimersByTimeAsync(100);
    expect(pathStoreMock.setText).toHaveBeenCalledOnce();
    await expect(getBookSaveState(bookUrl)).resolves.toMatchObject({ kind:'found',
      saveState:{ pages:[{ conclusion:{ incorrectGuessCount:1 } }] } });
  });

  it('reports a write failure and continues writing later snapshots', async () => {
    const { book, writer, onStorageError } = _createSession();
    const error = new Error('Storage unavailable');
    const logError = vi.spyOn(console, 'error').mockImplementation(() => {});
    pathStoreMock.setText.mockRejectedValueOnce(error);
    writer.requestImmediateSave();
    book.pageNo = 2;
    writer.requestImmediateSave();
    await writer.stopAndSettle();
    expect(onStorageError).toHaveBeenCalledExactlyOnceWith(expect.stringContaining(bookUrl));
    expect(logError).toHaveBeenCalledWith(expect.stringContaining(bookUrl), error);
    await expect(getBookSaveState(bookUrl)).resolves.toMatchObject({ kind:'found', saveState:{ pageNo:2 } });
  });

  it('defers while correct-claim queue publication is pending', async () => {
    const { book, writer } = _createSession();
    const page:ConclusionPage = { kind:'conclusion', chapterNo:1, headingText:'Claim', levelUrl:'/levels/first.md',
      conclusion:{ id:'claim', title:'Claim', parts:[], isComplete:false, isLocked:false, isOptional:false,
        incorrectGuessCount:0, unlockConclusionIds:[], revealRoomIds:[] },
      layoutTweaks:[], answerSetIdToPieceStyleNoMap:{} };
    book.pages.push(page);
    book.claimState = { conclusionPageI:0, page, blanks:[], startedAt:0, resultApplied:false,
      correct:true, ejectedCount:0, publication:'pending' };
    writer.requestImmediateSave();
    await vi.advanceTimersByTimeAsync(500);
    expect(pathStoreMock.setText).not.toHaveBeenCalled();
    page.conclusion.isComplete = true;
    book.claimState.resultApplied = true;
    delete book.claimState.publication;
    await vi.advanceTimersByTimeAsync(100);
    await expect(getBookSaveState(bookUrl)).resolves.toMatchObject({ kind:'found',
      saveState:{ pages:[{ conclusion:{ isComplete:true } }] } });
  });

  it('scopes delayed work to its original book URL and state', async () => {
    const first = _createSession();
    const otherUrl = '/other/book.md';
    const other = _createSession(false, otherUrl);
    first.book.pageNo = 2;
    other.book.pageNo = 3;
    first.writer.requestDebouncedSave();
    other.writer.requestImmediateSave();
    await vi.advanceTimersByTimeAsync(3000);
    await expect(getBookSaveState(bookUrl)).resolves.toMatchObject({ kind:'found', saveState:{ pageNo:2 } });
    await expect(getBookSaveState(otherUrl)).resolves.toMatchObject({ kind:'found', saveState:{ pageNo:3 } });
  });

  it('does not schedule or write for an unsupported snapshot version', async () => {
    const { writer } = _createSession(true);
    writer.requestImmediateSave();
    writer.requestDebouncedSave();
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(3000);
    expect(pathStoreMock.setText).not.toHaveBeenCalled();
  });

  it('cancels pending debounce work and ignores requests after stopping', async () => {
    const { writer } = _createSession();
    writer.requestDebouncedSave();
    await writer.stopAndSettle();
    writer.requestImmediateSave();
    await vi.advanceTimersByTimeAsync(3000);
    expect(pathStoreMock.setText).not.toHaveBeenCalled();
  });
});