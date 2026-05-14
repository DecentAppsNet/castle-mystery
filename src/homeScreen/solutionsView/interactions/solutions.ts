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