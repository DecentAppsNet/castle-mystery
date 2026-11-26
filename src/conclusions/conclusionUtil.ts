/* This file groups shared rules for interpreting conclusion answers.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import Conclusion from "./types/Conclusion.ts";
import ClozePartType from "./types/ClozePartType";
import ClozeBlank, { UNSPECIFIED_ANSWER } from "./types/ClozeBlank";

/** Normalizes category display text for answer matching and uniqueness. */
export function normalizeCategoryPhrase(phrase:string):string {
  return phrase.trim().toLowerCase();
}

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
  const selected = new Set<string>();

  // Count each wrong or repeated selection once; unspecified answers remain mistakes.
  for (const part of statement.parts) {
    if (part.type === ClozePartType.blank) {
      const blank = part as ClozeBlank;
      const answer = blank.playerAnswerIndex === UNSPECIFIED_ANSWER ? null
        : normalizeCategoryPhrase(blank.answerSet.answers[blank.playerAnswerIndex]);
      if (!blank.correctAnswerIndexes.includes(blank.playerAnswerIndex) || (answer !== null && selected.has(answer))) {
        mistakeCount++;
      }
      if (answer !== null) selected.add(answer);
    }
  }

  return mistakeCount;
}