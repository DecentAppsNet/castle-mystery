import SavedBookAnswerSet, { isValidSavedBookAnswerSet } from './SavedBookAnswerSet';
import SavedClozePart, { isValidSavedClozePart } from './SavedClozePart';
import { isStringArray } from '@/common/typeUtil';

type SavedBookConclusion = {
  readonly id:string; readonly title:string; readonly parts:readonly SavedClozePart[];
  readonly answerSets:readonly SavedBookAnswerSet[]; readonly isComplete:boolean; readonly isLocked:boolean;
  readonly isOptional:boolean; readonly incorrectGuessCount:number;
  readonly unlockConclusionIds:readonly string[]; readonly revealRoomIds:readonly string[];
};
export function isValidSavedBookConclusion(value:unknown):value is SavedBookConclusion {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const { id, title, parts, answerSets, isComplete, isLocked, isOptional, incorrectGuessCount,
    unlockConclusionIds, revealRoomIds } = value as Partial<SavedBookConclusion>;
  return typeof id === 'string' && typeof title === 'string' && Array.isArray(parts) && parts.every(isValidSavedClozePart)
    && Array.isArray(answerSets) && answerSets.every(isValidSavedBookAnswerSet)
    && typeof isComplete === 'boolean' && typeof isLocked === 'boolean' && typeof isOptional === 'boolean'
    && Number.isInteger(incorrectGuessCount) && isStringArray(unlockConclusionIds) && isStringArray(revealRoomIds);
}
export default SavedBookConclusion;