/* This file groups logical checks and counts for chapter conclusions.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import Conclusion from '@/conclusions/types/Conclusion';
import { isConclusionMissingAnswers } from '@/conclusions';

export function canClaimConclusion(conclusion:Readonly<Conclusion>):boolean {
  return !conclusion.isLocked && !conclusion.isComplete
    && conclusion.parts.some(part => part.type === 'blank') && !isConclusionMissingAnswers(conclusion);
}

export function countRemainingRequiredConclusions(conclusions:readonly Readonly<Conclusion>[]):number {
  return conclusions.filter(conclusion => !conclusion.isComplete && !conclusion.isOptional).length;
}

export function areAllRequiredConclusionsComplete(conclusions:readonly Readonly<Conclusion>[]):boolean {
  return countRemainingRequiredConclusions(conclusions) === 0;
}

export function countShameMarks(conclusions:readonly Readonly<Conclusion>[]):number {
  return conclusions.reduce((count, conclusion) => count + Math.max(0, conclusion.incorrectGuessCount - 1), 0);
}