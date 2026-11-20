import PieceSlotLayout from '../drawing/types/PieceSlotLayout';

type PieceSlotPresentation = {
  readonly slot:PieceSlotLayout;
  readonly offsetX:number;
  readonly scale:number;
};

export default PieceSlotPresentation;