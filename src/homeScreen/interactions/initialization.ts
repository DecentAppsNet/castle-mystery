/* This module groups home-screen initialization helpers that load the selected level and create initial runtime state.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { assert } from 'decent-portal';

import { msecsToMinutes } from '@/common/timeUtil';
import { prepareLevelState } from '../levelPreparation';
import { loadLevelFromUrl } from "@/levelLoading";
import { ImageSet, updateImageSetForLevel } from '@/imageLoading';
import InitResults from '../types/InitResults';
import { decodeBookSaveState, findBookImageUrls, loadBookFromUrl } from '@/book';
import BookState from '@/book/types/BookState';
import { getBookSaveState } from '@/persistence/bookSaveState';
import { getLastLevelUrl } from '@/persistence/lastLevel';
import { urlToFilename } from '@/common/urlUtil';
import { getClozeImageCandidateUrls } from '@/game/imageUrlUtil';

const BOOK_URL = '/levels/book.md';
type InitialBook = Pick<InitResults, 'bookState'|'bookUrl'|'bookLoadKind'>;

function _isCanonicalBookImageUrl(url:string):boolean {
  try {
    return getClozeImageCandidateUrls(urlToFilename(url)).includes(url);
  } catch {
    return false;
  }
}

async function _loadInitialBook(bookUrl:string):Promise<InitialBook> {
  const saved = await getBookSaveState(bookUrl).catch(error => {
    throw new Error(`Unable to read the book save for '${bookUrl}'.`, { cause:error });
  });
  if (saved.kind === 'found') {
    const bookState = decodeBookSaveState(saved.saveState);
    if (bookState && [...findBookImageUrls(bookState)].every(_isCanonicalBookImageUrl)) {
      return { bookState, bookUrl, bookLoadKind:'restored' };
    }
  }
  return { bookState:await loadBookFromUrl(bookUrl), bookUrl,
    bookLoadKind:saved.kind === 'unsupportedVersion' ? 'unsupportedVersion' : 'fresh' };
}

async function _chooseInitialLevelUrl(bookState:BookState):Promise<string> {
  const lastLevelUrl = await getLastLevelUrl(); // This might be a developer-selected level that is not part of the book.
  assert(bookState.levelUrls.length > 0);
  return lastLevelUrl ?? bookState.levelUrls[0];
}

/** Loads the initial level and prepares runtime state with the supplied session image store. */
export async function init(imageSet:ImageSet):Promise<InitResults> {
  const book = await _loadInitialBook(BOOK_URL);
  const initialLevelUrl = await _chooseInitialLevelUrl(book.bookState);
  const { level, errors } = await loadLevelFromUrl(initialLevelUrl);
  if (!level) {
    console.error(errors.describeErrors());
    throw new Error('Level could not be loaded due to errors. See console for details.');
  }
  await updateImageSetForLevel(level, imageSet);
  const missingBookImages = [...findBookImageUrls(book.bookState)].filter(url => !imageSet.findImage(url));
  await Promise.all(missingBookImages.map(url => imageSet.loadImage(url, true)));
  const prepared = await prepareLevelState(level, imageSet, initialLevelUrl);
  const { gameState } = prepared;
  const minutes = msecsToMinutes(gameState.time);
  return {
    ...prepared,
    ...book,
    minutes
  };
}
