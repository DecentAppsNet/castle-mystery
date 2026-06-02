import ClozePart, { duplicateClozePart } from './ClozePart';

type Solution = {
  readonly id: string;
  readonly title: string;
  parts: ClozePart[];
  isComplete:boolean;
  isLocked:boolean;
  readonly unlockSolutionIds:readonly string[];
  readonly revealRoomIds:readonly string[];
};

export function createDefaultSolution():Solution {
  return {
    id:'solution',
    title:'Solution',
    parts:[],
    isComplete:false,
    isLocked:false,
    unlockSolutionIds:[],
    revealRoomIds:[]
  };
}

export function duplicateSolution(from:Solution):Solution {
  return {
    id:from.id,
    title:from.title,
    parts:from.parts.map(duplicateClozePart),
    isComplete:from.isComplete,
    isLocked:from.isLocked,
    unlockSolutionIds:[...from.unlockSolutionIds],
    revealRoomIds:[...from.revealRoomIds]
  };
}

export default Solution;
