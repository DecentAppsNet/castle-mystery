import SavedBookPage, { isValidSavedBookPage } from './SavedBookPage';
import SavedBookPiece, { isValidSavedBookPiece } from './SavedBookPiece';
import { isStringArray } from '@/common/typeUtil';

type BookSaveState = { readonly version:1; readonly levelUrls:readonly string[]; readonly pageNo:number;
  readonly pages:readonly SavedBookPage[]; readonly pieceStack:readonly SavedBookPiece[] };

export function isValidBookSaveState(value:unknown):value is BookSaveState {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const { version, levelUrls, pageNo, pages, pieceStack } = value as Partial<BookSaveState>;
  return version === 1 && Number.isInteger(pageNo) && isStringArray(levelUrls)
    && Array.isArray(pages) && pages.every(isValidSavedBookPage)
    && Array.isArray(pieceStack) && pieceStack.every(isValidSavedBookPiece);
}

export default BookSaveState;