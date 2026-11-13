import Conclusion from "@/game/conclusions/types/Conclusion";
import BookState, { createDefaultBookState } from "./types/BookState";

const conclusion1:Conclusion = { // TODO - stub data to delete.
  id: "identities",
  title: "Identities",
  parts: [],
  isComplete: false,
  isLocked: true,
  unlockConclusionIds: [],
  revealRoomIds: []
}

//[Larry] took the vase to the [Gift Shop] and [hid] it with [other vases].
/*readonly availableAnswers: string[];
  readonly correctAnswerIndexes: number[];
  playerAnswerIndex: number;*/
const conclusion2:Conclusion = { // TODO - stub data to delete.
  id: "What Happened to the Vase?",
  title: "What Happened to the Vase?",
  parts: [
    { type:'blank', availableAnswers:['Larry', 'Marty', 'Lorenzo'], correctAnswerIndexes:[0], playerAnswerIndex:0 },
    { type:'text', text:' took the vase to the ' },
    { type:'blank', availableAnswers:['Gift Shop'], correctAnswerIndexes:[0], playerAnswerIndex:0 },
    { type:'text', text:' and ' },
    { type:'blank', availableAnswers:['hid'], correctAnswerIndexes:[0], playerAnswerIndex:0 },
    { type:'text', text:' it with ' },
    { type:'blank', availableAnswers:['other vases'], correctAnswerIndexes:[0], playerAnswerIndex:0 },
    { type:'text', text:'.' },
  ],
  isComplete: false,
  isLocked: false,
  unlockConclusionIds: [],
  revealRoomIds: []
}

export function createBookState():BookState { // TODO this will change later to take some data, similar to createGameState().
  const bookState = createDefaultBookState();
  bookState.pages = [
    { kind:'blank', headingText:'' },
    { kind:'bookStart', headingText:'', title:'Frederick\nand the\nFreemasons', author:'Erik Hermansen', description:'A tale of one young ruler besieged by trickery and manipulation. It may not, on all counts, be historically accurate. But honesty in the telling was certainly attempted.' },
    { kind:'chapterStart', headingText:'', title:'Prologue'  },
    { kind:'conclusion', headingText:'Identities', conclusion:conclusion1 },
    { kind:'conclusion', headingText:'Prologue - What Happened to the Vase?', conclusion:conclusion2 },
  ];
  bookState.pageNo = 1;
  bookState.isVisible = false;
  return bookState;
}