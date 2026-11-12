import Conclusion from "@/game/conclusions/types/Conclusion";
import BookState, { createDefaultBookState } from "./types/BookState";

const conclusion:Conclusion = { // TODO - stub data to delete.
  id: "identities",
  title: "Identities",
  parts: [],
  isComplete: false,
  isLocked: true,
  unlockConclusionIds: [],
  revealRoomIds: []
}

export function createBookState():BookState { // TODO this will change later to take some data, similar to createGameState().
  const bookState = createDefaultBookState();
  bookState.pages = [
    { kind:'blank', headingText:'' },
    { kind:'bookStart', headingText:'', title:'Frederick\nand the\nFreemasons', author:'Erik Hermansen', description:'A tale of one young ruler besieged by trickery and manipulation. It may not, on all counts, be historically accurate.' },
    { kind:'chapterStart', headingText:'', title:'Prologue'  },
    { kind:'conclusion', headingText:'Identities', conclusion },
    { kind:'conclusion', headingText:'Identities', conclusion },
  ];
  bookState.pageNo = 1;
  bookState.isVisible = false;
  return bookState;
}