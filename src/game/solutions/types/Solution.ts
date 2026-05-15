import ClozePart, { duplicateClozePart } from './ClozePart';

type Solution = {
  readonly id: string;
  readonly title: string;
  parts: ClozePart[];
  isComplete:boolean;
  isObscured:boolean;
  obscuredRemainingPhrases:string[];
};

export function duplicateSolution(from:Solution):Solution {
  return {
    id:from.id,
    title:from.title,
    parts:from.parts.map(duplicateClozePart),
    isComplete:from.isComplete,
    isObscured:from.isObscured,
    obscuredRemainingPhrases:[...from.obscuredRemainingPhrases]
  };
}

export default Solution;
