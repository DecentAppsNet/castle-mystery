import ClozeBlank from '@/conclusions/types/ClozeBlank';
import BookPage from './BookPage';

type PieceBase = {
  pageI:number,
  styleNo:number,
  text:string,
  xPercent:number, // Center X relative to the owning page for notes, or the spread for answers.
  yPercent:number // Center Y relative to the same bounds.
};

type AnswerPlacement = {
  readonly page:Extract<BookPage, { kind:'conclusion' }>,
  readonly blank:ClozeBlank
};

type AnswerPiece = PieceBase & {
  readonly kind:'answer',
  readonly pageI:number,
  placement:AnswerPlacement|null
};

type PageNotePiece = PieceBase & {
  readonly kind:'note'
};

type Piece = AnswerPiece | PageNotePiece;

export default Piece;