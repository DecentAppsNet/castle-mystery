import { afterEach, describe, expect, it, vi } from 'vitest';
import BookSaveCoordinator from '@/book/bookSaveCoordinator';
import { createDefaultBookState } from '@/book/types/BookState';
import { getBookSaveState } from '@/persistence/bookSaveState';
import { pathStoreMock } from '@/persistence/__tests__/pathStoreMock';
import { createPageNoteActions } from '../dialogs/pageNoteActions';

vi.mock('@/persistence/pathStore', async () => {
  const { pathStoreMock } = await import('@/persistence/__tests__/pathStoreMock');
  return pathStoreMock;
});

function _createFixture() {
  const book = createDefaultBookState();
  book.pages = [
    { kind:'blank', headingText:'', chapterNo:0 },
    { kind:'bookStart', headingText:'', chapterNo:0, title:'Book', subtitle:null, author:'' }
  ];
  const piece = { kind:'note' as const, pageI:1, styleNo:0, text:'', xPercent:20, yPercent:30 };
  return { book, piece, onClose:vi.fn() };
}

describe('page note editor commits', () => {
  afterEach(() => vi.useRealTimers());

  it('immediately writes creation, editing, and deletion, absorbing a pending page change', async () => {
    vi.useFakeTimers();
    pathStoreMock.reset();
    const { book, piece, onClose } = _createFixture();
    const bookUrl = '/levels/book.md';
    const onStorageError = vi.fn();
    const writer = new BookSaveCoordinator(bookUrl, book, false, onStorageError);
    const onCommitted = () => writer.requestImmediateSave();
    book.pageNo = 2;
    writer.requestDebouncedSave();

    createPageNoteActions(book, piece, true, onClose, onCommitted).onSubmit('First note');
    await vi.advanceTimersByTimeAsync(0);
    await expect(getBookSaveState(bookUrl)).resolves.toMatchObject({ kind:'found', saveState:{
      pageNo:2, pieceStack:[{ kind:'note', pageI:1, text:'First note' }]
    } });
    await vi.advanceTimersByTimeAsync(3000);
    expect(pathStoreMock.setText).toHaveBeenCalledOnce();

    const editor = createPageNoteActions(book, piece, false, onClose, onCommitted);
    editor.onSubmit('Updated note');
    await vi.advanceTimersByTimeAsync(0);
    await expect(getBookSaveState(bookUrl)).resolves.toMatchObject({ kind:'found', saveState:{
      pieceStack:[{ text:'Updated note' }]
    } });

    editor.onDelete?.();
    await writer.stopAndSettle();
    await expect(getBookSaveState(bookUrl)).resolves.toMatchObject({ kind:'found', saveState:{ pieceStack:[] } });
    expect(pathStoreMock.setText).toHaveBeenCalledTimes(3);
    expect(onClose).toHaveBeenCalledTimes(3);
    expect(onStorageError).not.toHaveBeenCalled();
  });

  it('closes without changing the note or signalling a save on cancel or unchanged submit', () => {
    const { book, piece, onClose } = _createFixture();
    const onCommitted = vi.fn();
    createPageNoteActions(book, piece, true, onClose, onCommitted).onCancel();
    expect(book.pieceStack).toEqual([]);

    piece.text = 'Existing note';
    book.pieceStack = [piece];
    const editor = createPageNoteActions(book, piece, false, onClose, onCommitted);
    editor.onCancel();
    editor.onSubmit('Existing note');
    expect(book.pieceStack).toEqual([piece]);
    expect(piece.text).toBe('Existing note');
    expect(onCommitted).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(3);
  });
});