import Solution, { duplicateSolution } from './types/Solution';

export function syncSolutionsWithUnlocks(solutions:Solution[]):{ solutions:Solution[], didChange:boolean } {
  const unlockedSolutionIds = new Set(solutions
    .filter(solution => solution.isComplete)
    .flatMap(solution => solution.unlockSolutionIds));
  let didChange = false;

  const nextSolutions = solutions.map(solution => {
    if (!solution.isLocked) return solution;

    if (!unlockedSolutionIds.has(solution.id)) return solution;

    didChange = true;
    const nextSolution = duplicateSolution(solution);
    nextSolution.isLocked = false;
    return nextSolution;
  });

  return { solutions:nextSolutions, didChange };
}