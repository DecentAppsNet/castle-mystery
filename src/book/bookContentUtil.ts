/* This file creates temporary book pages and their generated loose-piece inventory.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import Conclusion from "@/game/conclusions/types/Conclusion";
import BookState, { createDefaultBookState } from "./types/BookState";
import { generatePieceStack } from "./pieceGenerationUtil";
import { createAnswerSet } from "@/game/conclusions/answerSetUtil";
import { generateAnswerSetIdToPieceStyleNoMap } from './answerSetPieceStyleUtil';

const characterAnswerSet = createAnswerSet(["Amos of Jesi","Constance I","Pope Innocent III","Sofia the Midwife","Sticky Agatha","Ugolino di Conti"], ['characters'], true);
const conclusion1:Conclusion = { // TODO - stub data to delete.
  id: "identities",
  title: "Identities",
  parts: [
    {type:"image", imageUrl:"/assets/bodies/amosTheGuard.png"},
    {type:"text", text:"\t= "},
    {type:"blank", answerSet:characterAnswerSet, correctAnswerIndexes:[0], playerAnswerIndex:0},
    {type:"separator"},
    {type:"image", imageUrl:"/assets/bodies/constanceI.png"},
    {type:"text",text:"\t= "},
    {type:"blank",answerSet:characterAnswerSet,correctAnswerIndexes:[1],playerAnswerIndex:-1},
    {type:"separator"},
    {type:"image",imageUrl:"/assets/bodies/ugolino.png"},
    {type:"text",text:"\t= "},
    {type:"blank",answerSet:characterAnswerSet,correctAnswerIndexes:[5],playerAnswerIndex:-1},
    {type:"separator"},
    {type:"image",imageUrl:"/assets/bodies/pope.png"},
    {type:"text",text:"\t= "},
    {type:"blank",answerSet:characterAnswerSet,correctAnswerIndexes:[2],playerAnswerIndex:-1},
    {type:"separator"},
    {type:"image",imageUrl:"/assets/bodies/stickyAgatha.png"},
    {type:"text",text:"\t= "},
    {type:"blank",answerSet:characterAnswerSet,correctAnswerIndexes:[4],playerAnswerIndex:-1},
    {type:"separator"},
    {type:"image",imageUrl:"/assets/bodies/midwife.png"},
    {type:"text",text:"\t= "},
    {type:"blank",answerSet:characterAnswerSet,correctAnswerIndexes:[3],playerAnswerIndex:-1},
  ],
  isComplete: false,
  isLocked: false,
  unlockConclusionIds: ['the relic'],
  revealRoomIds: []
}

const conclusion2:Conclusion = { // TODO - stub data to delete.
  id: "the relic",
  title: "The Relic",
  parts: [
   {type:"text",text:"The "},
  {type:"blank",answerSet:createAnswerSet(["Coffer","Holy Binky","Infant","Letter","Newborn Baby","Vase"], ['items'], true),correctAnswerIndexes:[1],playerAnswerIndex:-1},
   {type:"text",text:" was regifted to "},
  {type:"blank",answerSet:characterAnswerSet,"correctAnswerIndexes":[4],playerAnswerIndex:-1},
   {type:"text",text:"."}
  ],
  isComplete: false,
  isLocked: false,
  unlockConclusionIds: [],
  revealRoomIds: []
}

const custodyCharacterAnswerSet = createAnswerSet(["Helena of Gaeta", "Hugo of Speyer", "King Frederick", "Matteo il Toro", "Pope Innocent III", "Raniero de Stefano", "the Freemasons", "Helena", "Raniero", "Toro", "Hugo", "The King", "The Pope", "Nobody", "The wind"], ['characters'], true);
const custodyRoomAnswerSet = createAnswerSet(["Courtyard", "East Hall", "East Stairwell", "Grain Store", "Guard Chamber", "Lawn", "Liturgical Vault", "Lower Passage", "Portcullis Chamber", "Steward's Office", "Textile Store", "West Hall", "Wine Cellar", "Arabic Tower"], ['rooms'], true);
const conclusion3:Conclusion = {
  id: "chain of custody",
  title: "Chain of Custody",
  parts: [
    {type:"text",text:"These people carried or saw the Black Brick."},
    {type:"separator"},
    {type:"text",text:"1. "},
    {type:"blank",answerSet:custodyCharacterAnswerSet,correctAnswerIndexes:[0],playerAnswerIndex:-1},
    {type:"text",text:" noticed it in the "},
    {type:"blank",answerSet:custodyRoomAnswerSet,correctAnswerIndexes:[11],playerAnswerIndex:-1},
    {type:"text",text:", but did not pick it up."},
    {type:"separator"},
    {type:"text",text:"2. "},
    {type:"blank",answerSet:custodyCharacterAnswerSet,correctAnswerIndexes:[1],playerAnswerIndex:-1},
    {type:"text",text:" snatched the brick."},
    {type:"separator"},
    {type:"text",text:"3. "},
    {type:"text",text:"He gave the brick to "},
    {type:"blank",answerSet:custodyCharacterAnswerSet,correctAnswerIndexes:[4],playerAnswerIndex:-1},
    {type:"text",text:" in the "},
    {type:"blank",answerSet:custodyRoomAnswerSet,correctAnswerIndexes:[2],playerAnswerIndex:-1},
    {type:"text",text:"."},
    {type:"separator"},
    {type:"text",text:"4. "},
    {type:"text",text:"The Pope "},
    {type:"blank",answerSet:createAnswerSet(["discovered", "cremated", "painted", "planted", "rebuked", "salvaged"], ['discovery verbs'], true),correctAnswerIndexes:[3],playerAnswerIndex:-1},
    {type:"text",text:" it in the "},
    {type:"blank",answerSet:custodyRoomAnswerSet,correctAnswerIndexes:[13],playerAnswerIndex:-1},
    {type:"text",text:", attempting to "},
    {type:"blank",answerSet:createAnswerSet(["fall", "hide", "disappear", "succeed", "speak", "initiate", "deceive", "murder"], ['intent verbs'], true),correctAnswerIndexes:[6],playerAnswerIndex:-1},
    {type:"text",text:" "},
    {type:"blank",answerSet:custodyCharacterAnswerSet,correctAnswerIndexes:[2],playerAnswerIndex:-1},
    {type:"text",text:"."}
  ],
  isComplete: false,
  isLocked: false,
  unlockConclusionIds: [],
  revealRoomIds: []
}

export function createBookState():BookState { // TODO this will change later to take some data, similar to createGameState().
  // Establish all pages before generating their loose-piece inventory.
  const bookState = createDefaultBookState();
  bookState.pages = [
    { kind:'blank', headingText:'' },
    { kind:'bookStart', headingText:'', title:'Frederick\nand the\nFreemasons', subtitle:null, author:'Erik Hermansen' },
    { kind:'blank', headingText:'' },
    { kind:'chapterStart', headingText:'', title:'Birth of Constantine', chapterNo:1, description:'Wherein Frederick is introduced to the World by a different name, and the earliest seeds of trouble are planted.' },
    { kind:'conclusion', headingText:'Chap. I - Identities', conclusion:conclusion1,
      answerSetIdToPieceStyleNoMap:generateAnswerSetIdToPieceStyleNoMap(conclusion1) },
    { kind:'blank', headingText:'Chap. I - Identities' },
    { kind:'conclusion', headingText:'Chap. I - The Relic', conclusion:conclusion2,
      answerSetIdToPieceStyleNoMap:generateAnswerSetIdToPieceStyleNoMap(conclusion2) },
    { kind:'blank', headingText:'Chap. I - The Relic' },
    { kind:'conclusion', headingText:'Chap. I - Chain of Custody', conclusion:conclusion3,
      answerSetIdToPieceStyleNoMap:generateAnswerSetIdToPieceStyleNoMap(conclusion3) },
    { kind:'blank', headingText:'Chap. I - Chain of Custody' },
  ];
  bookState.pieceStack = generatePieceStack(bookState);

  // Start with the book closed at its first page.
  bookState.pageNo = 1;
  bookState.isVisible = false;
  return bookState;
}