import Control from "@/canvasControls/types/Control";
import Piece from "@/book/types/Piece";
import PageTextBoxMetrics from "./PageTextBoxMetrics";

type PieceLayout = Control & {
  readonly piece:Piece;
  readonly metrics:PageTextBoxMetrics;
};

export default PieceLayout;