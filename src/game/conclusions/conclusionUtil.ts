/* This module groups conclusion comparison, blank-state, and cloze-answer helpers for the conclusions UI.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import Conclusion from "./types/Conclusion.ts";
import ClozePartType from "./types/ClozePartType";
import ClozeBlank, { UNSPECIFIED_ANSWER } from "./types/ClozeBlank";

export function isConclusionMissingAnswers(conclusion: Conclusion): boolean {
  for (const part of conclusion.parts) {
    if (part.type !== ClozePartType.blank) continue;
    const blank = part as ClozeBlank;
    if (blank.playerAnswerIndex === UNSPECIFIED_ANSWER) return true;
  }
  return false;
}

export function countConclusionMistakes(statement: Conclusion): number {
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