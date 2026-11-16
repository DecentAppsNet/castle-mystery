import Point from "@/game/types/Point";
import Piece from "./Piece";

type PieceDragState = {
  readonly piece:Piece;
  readonly grabOffset:Point;
};

export default PieceDragState;