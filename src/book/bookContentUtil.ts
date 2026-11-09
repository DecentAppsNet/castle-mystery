import BookState, { createDefaultBookState } from "./types/BookState";

export function createBookState():BookState { // TODO this will change later to take some data, similar to createGameState().
  const bookState = createDefaultBookState();
  bookState.pages = [
    { kind:'blank', headingText:'' },
    { kind:'bookStart', headingText:'Frederick and the Freemasons' },
    { kind:'chapterStart', headingText:'Prologue' },
    { kind:'conclusion', headingText:'Identities' },
  ];
  bookState.pageNo = 1;
  bookState.isVisible = false;
  return bookState;
}