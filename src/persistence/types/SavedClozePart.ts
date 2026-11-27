type SavedClozePart = { readonly type:'text'; readonly text:string } | { readonly type:'separator' }
  | { readonly type:'image'; readonly imageUrl:string } | { readonly type:'blank'; readonly answerSetI:number;
      readonly correctAnswerIndexes:readonly number[]; readonly playerAnswerIndex:number };

export function isValidSavedClozePart(value:unknown):value is SavedClozePart {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const part = value as Partial<SavedClozePart>;
  if (part.type === 'text') return typeof part.text === 'string';
  if (part.type === 'image') return typeof part.imageUrl === 'string';
  return part.type === 'separator' || (part.type === 'blank' && Number.isInteger(part.answerSetI)
    && Array.isArray(part.correctAnswerIndexes) && part.correctAnswerIndexes.every(Number.isInteger)
    && Number.isInteger(part.playerAnswerIndex));
}
export default SavedClozePart;