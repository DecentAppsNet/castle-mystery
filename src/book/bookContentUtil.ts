import Conclusion from "@/game/conclusions/types/Conclusion";
import BookState, { createDefaultBookState } from "./types/BookState";

/*
[{"id":"identities","title":"Identities","parts":[
{"type":"image","imageUrl":"/assets/bodies/amosTheGuard.png"},{"type":"text","text":" = "},{"type":"blank","availableAnswers":["Amos of Jesi","Constance I","Pope Innocent III","Sofia the Midwife","Sticky Agatha","Ugolino di Conti"],"correctAnswerIndexes":[0],"playerAnswerIndex":-1},{"type":"separator"},{"type":"image","imageUrl":"/assets/bodies/constanceI.png"},{"type":"text","text":" = "},{"type":"blank","availableAnswers":["Amos of Jesi","Constance I","Pope Innocent III","Sofia the Midwife","Sticky Agatha","Ugolino di Conti"],"correctAnswerIndexes":[1],"playerAnswerIndex":-1},{"type":"separator"},{"type":"image","imageUrl":"/assets/bodies/ugolino.png"},{"type":"text","text":" = "},{"type":"blank","availableAnswers":["Amos of Jesi","Constance I","Pope Innocent III","Sofia the Midwife","Sticky Agatha","Ugolino di Conti"],"correctAnswerIndexes":[5],"playerAnswerIndex":-1},{"type":"separator"},{"type":"image","imageUrl":"/assets/bodies/pope.png"},{"type":"text","text":" = "},{"type":"blank","availableAnswers":["Amos of Jesi","Constance I","Pope Innocent III","Sofia the Midwife","Sticky Agatha","Ugolino di Conti"],"correctAnswerIndexes":[2],"playerAnswerIndex":-1},{"type":"separator"},{"type":"image","imageUrl":"/assets/bodies/stickyAgatha.png"},{"type":"text","text":" = "},{"type":"blank","availableAnswers":["Amos of Jesi","Constance I","Pope Innocent III","Sofia the Midwife","Sticky Agatha","Ugolino di Conti"],"correctAnswerIndexes":[4],"playerAnswerIndex":-1},{"type":"separator"},{"type":"image","imageUrl":"/assets/bodies/midwife.png"},{"type":"text","text":" = "},{"type":"blank","availableAnswers":["Amos of Jesi","Constance I","Pope Innocent III","Sofia the Midwife","Sticky Agatha","Ugolino di Conti"],"correctAnswerIndexes":[3],"playerAnswerIndex":-1}],"unlockConclusionIds":["the relic"],"revealRoomIds":[],"isComplete":false,"isLocked":false},{"id":"the relic","title":"The Relic","parts":[{"type":"text","text":"The "},{"type":"blank","availableAnswers":["Coffer","Holy Binky","Infant","Letter","Newborn Baby","Vase"],"correctAnswerIndexes":[1],"playerAnswerIndex":-1},{"type":"text","text":" was regifted to "},{"type":"blank","availableAnswers":["Amos of Jesi","Constance I","Pope Innocent III","Sofia the Midwife","Sticky Agatha","Ugolino di Conti"],"correctAnswerIndexes":[4],"playerAnswerIndex":-1},{"type":"text","text":"."}],"isComplete":false,"isLocked":true,"unlockConclusionIds":[],"revealRoomIds":[]}]
*/

const characterNames = ["Amos of Jesi","Constance I","Pope Innocent III","Sofia the Midwife","Sticky Agatha","Ugolino di Conti"];
const conclusion1:Conclusion = { // TODO - stub data to delete.
  id: "identities",
  title: "Identities",
  parts: [
    {type:"image", imageUrl:"/assets/bodies/amosTheGuard.png"},
    {type:"text", text:"\t= "},
    {type:"blank", availableAnswers:characterNames, correctAnswerIndexes:[0], playerAnswerIndex:-1},
    {type:"separator"},
    {type:"image", imageUrl:"/assets/bodies/constanceI.png"},
    {type:"text",text:"\t= "},
    {type:"blank",availableAnswers:characterNames,correctAnswerIndexes:[1],playerAnswerIndex:-1},
    {type:"separator"},
    {type:"image",imageUrl:"/assets/bodies/ugolino.png"},
    {type:"text",text:"\t= "},
    {type:"blank",availableAnswers:characterNames,correctAnswerIndexes:[5],playerAnswerIndex:-1},
    {type:"separator"},
    {type:"image",imageUrl:"/assets/bodies/pope.png"},
    {type:"text",text:"\t= "},
    {type:"blank",availableAnswers:characterNames,correctAnswerIndexes:[2],playerAnswerIndex:-1},
    {type:"separator"},
    {type:"image",imageUrl:"/assets/bodies/stickyAgatha.png"},
    {type:"text",text:"\t= "},
    {type:"blank",availableAnswers:characterNames,correctAnswerIndexes:[4],playerAnswerIndex:-1},
    {type:"separator"},
    {type:"image",imageUrl:"/assets/bodies/midwife.png"},
    {type:"text",text:"\t= "},
    {type:"blank",availableAnswers:characterNames,correctAnswerIndexes:[3],playerAnswerIndex:-1},
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
   {type:"blank",availableAnswers:["Coffer","Holy Binky","Infant","Letter","Newborn Baby","Vase"],correctAnswerIndexes:[1],playerAnswerIndex:-1},
   {type:"text",text:" was regifted to "},
   {type:"blank","availableAnswers":characterNames,"correctAnswerIndexes":[4],playerAnswerIndex:-1},
   {type:"text",text:"."}
  ],
  isComplete: false,
  isLocked: true,
  unlockConclusionIds: [],
  revealRoomIds: []
}

export function createBookState():BookState { // TODO this will change later to take some data, similar to createGameState().
  const bookState = createDefaultBookState();
  bookState.pages = [
    { kind:'blank', headingText:'' },
    { kind:'bookStart', headingText:'', title:'Frederick\nand the\nFreemasons', subtitle:null, author:'Erik Hermansen' },
    { kind:'blank', headingText:'' },
    { kind:'chapterStart', headingText:'', title:'Birth of Constantine', chapterNo:1, description:'Wherein Frederick is introduced to the World by a different name, and the earliest seeds of trouble are planted.' },
    { kind:'conclusion', headingText:'Chap. I - Identities', conclusion:conclusion1 },
    { kind:'conclusion', headingText:'Chap. I - Locked Conclusion', conclusion:conclusion2 },
  ];
  bookState.pageNo = 1;
  bookState.isVisible = false;
  return bookState;
}