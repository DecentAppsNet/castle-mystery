import BookSaveState from './BookSaveState';

type BookSaveReadResult =
  | { readonly kind:'found'; readonly saveState:BookSaveState }
  | { readonly kind:'missing' }
  | { readonly kind:'unusable' }
  | { readonly kind:'unsupportedVersion'; readonly version:number };

export default BookSaveReadResult;