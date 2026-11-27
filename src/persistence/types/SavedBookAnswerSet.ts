import { isStringArray } from '@/common/typeUtil';

type SavedBookAnswerSet = { readonly sourceCategoryId:string; readonly answers:readonly string[] };

export function isValidSavedBookAnswerSet(value:unknown):value is SavedBookAnswerSet {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const { sourceCategoryId, answers } = value as Partial<SavedBookAnswerSet>;
  return typeof sourceCategoryId === 'string' && isStringArray(answers);
}
export default SavedBookAnswerSet;