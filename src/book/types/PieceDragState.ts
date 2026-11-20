import Point from "@/game/types/Point";
import Piece from "./Piece";
import PageTextBoxMetrics from '../drawing/types/PageTextBoxMetrics';

type PieceDragState = {
  readonly piece:Piece;
  readonly grabOffset:Point;
  readonly extractedAppearance:{
    readonly height:number;
    readonly metrics:PageTextBoxMetrics;
  }|null;
};

export default PieceDragState;