import ClozePartBase from './ClozePartBase';
import AnswerSet from './AnswerSet';

export const UNSPECIFIED_ANSWER = -1;

type ClozeBlank = ClozePartBase & {
  readonly answerSet:AnswerSet;
  readonly correctAnswerIndexes: number[];
  playerAnswerIndex: number;
};

export default ClozeBlank;