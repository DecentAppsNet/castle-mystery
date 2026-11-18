import ClozePartBase from './ClozePartBase';
import AnswerSet from './AnswerSet';

export const UNSPECIFIED_ANSWER = -1;

type ClozeBlank = ClozePartBase & {
  readonly availableAnswers: string[];
  readonly answerSet?:AnswerSet;
  readonly correctAnswerIndexes: number[];
  playerAnswerIndex: number;
};

export function duplicateClozeBlank(from:ClozeBlank):ClozeBlank {
  return {
    type:from.type,
    availableAnswers:[...from.availableAnswers],
    ...(from.answerSet ? { answerSet:from.answerSet } : {}),
    correctAnswerIndexes:[...from.correctAnswerIndexes],
    playerAnswerIndex:from.playerAnswerIndex
  };
}

export default ClozeBlank;
