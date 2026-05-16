import ClozePart, { duplicateClozePart } from './ClozePart';

type Solution = {
  readonly id: string;
  readonly title: string;
  parts: ClozePart[];
  isComplete:boolean;
  isLocked:boolean;
  unlockForItemId:string|null;
  unlockForSolutionId:string|null;
};

export function duplicateSolution(from:Solution):Solution {
  return {
    id:from.id,
    title:from.title,
    parts:from.parts.map(duplicateClozePart),
    isComplete:from.isComplete,
    isLocked:from.isLocked,
    unlockForItemId:from.unlockForItemId,
    unlockForSolutionId:from.unlockForSolutionId
  };
}

export default Solution;
