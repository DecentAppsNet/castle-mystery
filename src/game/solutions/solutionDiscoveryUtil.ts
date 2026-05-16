import Solution, { duplicateSolution } from './types/Solution';

function _normalizeItemReference(reference:string):string {
  return reference.trim().toLowerCase();
}

export function syncSolutionsWithUnlocks(solutions:Solution[], viewedItemIds:ReadonlySet<string>):{ solutions:Solution[], didChange:boolean } {
  const completedSolutionIds = new Set(solutions.filter(solution => solution.isComplete).map(solution => solution.id));
  const normalizedViewedItemIds = new Set(Array.from(viewedItemIds).map(_normalizeItemReference));
  let didChange = false;

  const nextSolutions = solutions.map(solution => {
    if (!solution.isLocked) return solution;

    const isUnlockedByItem = solution.unlockForItemId
      ? normalizedViewedItemIds.has(_normalizeItemReference(solution.unlockForItemId))
      : false;
    const isUnlockedBySolution = solution.unlockForSolutionId ? completedSolutionIds.has(solution.unlockForSolutionId) : false;
    if (!isUnlockedByItem && !isUnlockedBySolution) return solution;

    didChange = true;
    const nextSolution = duplicateSolution(solution);
    nextSolution.isLocked = false;
    return nextSolution;
  });

  return { solutions:nextSolutions, didChange };
}