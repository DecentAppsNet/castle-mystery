import ClozePart, { duplicateClozePart } from './ClozePart';

type Solution = {
  readonly id: string;
  readonly title: string;
  parts: ClozePart[];
  isComplete:boolean;
  isLocked:boolean;
  unlockForSolutionId:string|null;
  revealRoomIds:string[];
};

export function duplicateSolution(from:Solution):Solution {
  return {
    id:from.id,
    title:from.title,
    parts:from.parts.map(duplicateClozePart),
    isComplete:from.isComplete,
    isLocked:from.isLocked,
    unlockForSolutionId:from.unlockForSolutionId,
    revealRoomIds:[...from.revealRoomIds]
  };
}

export default Solution;
