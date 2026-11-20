import Point from "@/game/types/Point";
import Piece from "./Piece";
import PieceLayout from '../drawing/types/PieceLayout';

type PieceDragState = {
  readonly piece:Piece;
  readonly grabOffset:Point;
  readonly extractedLayout:PieceLayout|null;
};

export default PieceDragState;