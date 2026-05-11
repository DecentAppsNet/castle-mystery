import Solution from "./types/Solution.ts";
import ClozePartType from "./types/ClozePartType";
import ClozeBlank from "./types/ClozeBlank";

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