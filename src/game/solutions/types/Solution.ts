import ClozePart, { duplicateClozePart } from './ClozePart';

type Solution = {
  readonly id: string;
  readonly title: string;
  parts: ClozePart[];
};

export function duplicateSolution(from:Solution):Solution {
  return {
    id:from.id,
    title:from.title,
    parts:from.parts.map(duplicateClozePart)
  };
}

export default Solution;
