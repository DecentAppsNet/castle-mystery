/* This module groups the cloze-blank model, its sentinel value, and its duplication helper.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import ClozePartBase from './ClozePartBase';

export const UNSPECIFIED_ANSWER = -1;

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
