import Solution, { duplicateSolution } from './types/Solution';

export function syncSolutionsWithUnlocks(solutions:Solution[]):{ solutions:Solution[], didChange:boolean } {
  const completedSolutionIds = new Set(solutions.filter(solution => solution.isComplete).map(solution => solution.id));
  let didChange = false;

  const nextSolutions = solutions.map(solution => {
    if (!solution.isLocked) return solution;

    const isUnlockedBySolution = solution.unlockForSolutionId ? completedSolutionIds.has(solution.unlockForSolutionId) : false;
    if (!isUnlockedBySolution) return solution;

    didChange = true;
    const nextSolution = duplicateSolution(solution);
    nextSolution.isLocked = false;
    return nextSolution;
  });

  return { solutions:nextSolutions, didChange };
}