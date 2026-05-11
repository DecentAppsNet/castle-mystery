import ClozePartBase from './ClozePartBase';

type ClozeBlank = ClozePartBase & {
  readonly availableAnswers: string[];
  readonly correctAnswerIndexes: number[];
  playerAnswerIndex: number;
};

export function duplicateClozeBlank(from:ClozeBlank):ClozeBlank {
  return {
    type:from.type,
    availableAnswers:[...from.availableAnswers],
    correctAnswerIndexes:[...from.correctAnswerIndexes],
    playerAnswerIndex:from.playerAnswerIndex
  };
}

export default ClozeBlank;
