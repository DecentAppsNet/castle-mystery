import BookLayout from '../drawing/types/BookLayout';
import PieceSlotLayout from '../drawing/types/PieceSlotLayout';

type PieceSlotTransition = {
  readonly layout:BookLayout;
  readonly slot:PieceSlotLayout;
  readonly fromScale:number;
  readonly toScale:number;
  readonly startedAt:number;
};

export default PieceSlotTransition;