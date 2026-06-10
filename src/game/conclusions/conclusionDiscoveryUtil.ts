/* This module groups runtime conclusion-unlock discovery helpers that synchronize unlocked conclusions from solved ones.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import Conclusion, { duplicateConclusion } from './types/Conclusion';

export function syncConclusionsWithUnlocks(conclusions:Conclusion[]):{ conclusions:Conclusion[], didChange:boolean } {
  const unlockedConclusionIds = new Set(conclusions
    .filter(conclusion => conclusion.isComplete)
    .flatMap(conclusion => conclusion.unlockConclusionIds));
  let didChange = false;

  const nextConclusions = conclusions.map(conclusion => {
    if (!conclusion.isLocked) return conclusion;

    if (!unlockedConclusionIds.has(conclusion.id)) return conclusion;

    didChange = true;
    const nextConclusion = duplicateConclusion(conclusion);
    nextConclusion.isLocked = false;
    return nextConclusion;
  });

  return { conclusions:nextConclusions, didChange };
}