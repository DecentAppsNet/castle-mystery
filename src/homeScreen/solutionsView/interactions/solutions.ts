/* This module groups solution-claim interaction helpers for the home-screen solutions UI.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { countSolutionMistakes } from "@/game/solutions/solutionUtil";
import Solution, { duplicateSolution } from "@/game/solutions/types/Solution";

export function claimSolution(solution:Solution, setModalDialogName:Function, onUpdateSolution:(solution:Solution) => void):boolean {
  if (countSolutionMistakes(solution) === 0) {
    const nextSolution = duplicateSolution(solution);
    nextSolution.isComplete = true;
    onUpdateSolution(nextSolution);
    setModalDialogName(null);
    return true;
  }
  return false;
}