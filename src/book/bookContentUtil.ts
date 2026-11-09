import BookState, { createDefaultBookState } from "./types/BookState";

export function createBookState():BookState { // TODO this will change later to take some data, similar to createGameState().
  const bookState = createDefaultBookState();
  bookState.pages = [
    { kind:'blank' },
    { kind:'bookStart' },
  ];
  bookState.pageNo = 1;
  bookState.isVisible = false;
  return bookState;
}