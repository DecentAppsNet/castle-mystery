import Rect from "@/game/types/Rect";
import Piece from "../../types/Piece";
import PageTextBoxMetrics from "./PageTextBoxMetrics";

type PieceLayout = {
  readonly piece:Piece;
  readonly rect:Rect;
  readonly metrics:PageTextBoxMetrics;
};

export default PieceLayout;