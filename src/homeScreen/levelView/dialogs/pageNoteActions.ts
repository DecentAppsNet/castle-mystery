import type BookState from '@/book/types/BookState';
import type Piece from '@/book/types/Piece';

export function createPageNoteActions(book:BookState, piece:Piece, isNew:boolean,
  onClose:() => void, onCommitted:() => void) {
  return {
    onCancel:onClose,
    onDelete:isNew ? undefined : () => {
      if (book.pieceStack.includes(piece)) {
        book.pieceStack = book.pieceStack.filter(candidate => candidate !== piece);
        onCommitted();
      }
      onClose();
    },
    onSubmit:(text:string) => {
      if (isNew || (book.pieceStack.includes(piece) && piece.text !== text)) {
        piece.text = text;
        if (isNew) book.pieceStack = [...book.pieceStack, piece];
        onCommitted();
      }
      onClose();
    }
  };
}