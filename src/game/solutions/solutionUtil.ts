import Solution from "./types/Solution.ts";
import ClozePartType from "./types/ClozePartType";
import ClozeBlank, { UNSPECIFIED_ANSWER } from "./types/ClozeBlank";

export function isSolutionMissingAnswers(solution: Solution): boolean {
  for (const part of solution.parts) {
    if (part.type !== ClozePartType.blank) continue;
    const blank = part as ClozeBlank;
    if (blank.playerAnswerIndex === UNSPECIFIED_ANSWER) return true;
  }
  return false;
}

export function countSolutionMistakes(statement: Solution): number {
  let mistakeCount = 0;

  for (const part of statement.parts) {
    if (part.type === ClozePartType.blank) {
      const blank = part as ClozeBlank;
      if (!blank.correctAnswerIndexes.includes(blank.playerAnswerIndex)) {
        mistakeCount++;
      }
    }
  }

  return mistakeCount;
}