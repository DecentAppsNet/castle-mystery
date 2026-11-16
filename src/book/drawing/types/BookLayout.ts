import ControlLayout from "@/canvasControls/types/ControlLayout";
import Rect from "@/game/types/Rect"
import PieceLayout from "./PieceLayout";

type BookLayout = {
  canvasWidth:number, // Canvas backing-store width in pixels when this layout was calculated.
  canvasHeight:number, // Canvas backing-store height in pixels when this layout was calculated.
  isSinglePageView:boolean, // Whether the canvas fits only one page rather than the full spread.
  singlePageViewOffsetX:number, // Horizontal shift magnitude used to center the selected page in single-page view.
  rect:Rect, // Full two-page book rectangle in canvas pixels, before page-view and animation offsets.
  pieceLayouts:ReadonlyArray<PieceLayout>, // Prepared piece references, displayed canvas rectangles, and text metrics; empty while invalid or animating.
  pieceLayoutsPageNo:number|null, // Selected page number used to prepare the piece records, or null while they are invalid.
  controlLayout:ControlLayout // Navigation control rectangles before the page-view offset, plus visibility and hover state.
}

export default BookLayout;