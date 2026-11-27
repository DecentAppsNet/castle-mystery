type SavedBookPiece = { readonly pageI:number; readonly styleNo:number; readonly text:string;
  readonly xPercent:number; readonly yPercent:number } & (
  | { readonly kind:'note' }
  | { readonly kind:'answer'; readonly placement:{ readonly pageI:number; readonly partI:number }|null });

export function isValidSavedBookPiece(value:unknown):value is SavedBookPiece {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const piece = value as Partial<SavedBookPiece>;
  if (!Number.isInteger(piece.pageI) || !Number.isInteger(piece.styleNo) || typeof piece.text !== 'string'
    || !Number.isFinite(piece.xPercent) || !Number.isFinite(piece.yPercent)) return false;
  if (piece.kind === 'note') return !('placement' in piece);
  if (piece.kind !== 'answer') return false;
  const { placement } = piece;
  return placement === null || (typeof placement === 'object' && !Array.isArray(placement)
    && Number.isInteger(placement.pageI) && Number.isInteger(placement.partI));
}
export default SavedBookPiece;