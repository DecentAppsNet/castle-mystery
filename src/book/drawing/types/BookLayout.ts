import ControlLayout from "@/canvasControls/types/ControlLayout";
import Rect from "@/game/types/Rect"
import PieceLayout from "./PieceLayout";
import PieceSlotLayout from "./PieceSlotLayout";

type BookLayout = {
  canvasWidth:number, // Canvas backing-store width in pixels when this layout was calculated.
  canvasHeight:number, // Canvas backing-store height in pixels when this layout was calculated.
  isSinglePageView:boolean, // Whether the canvas fits only one page rather than the full spread.
  rect:Rect, // Full two-page book rectangle in canvas pixels, before page-view and animation offsets.
  pieceLayouts:ReadonlyArray<PieceLayout>, // Prepared piece references, displayed canvas rectangles, and text metrics; empty while invalid or animating.
  pieceSlotLayouts:ReadonlyArray<PieceSlotLayout>, // Normal slot rectangles and actual page/blank ownership for the interactive view.
  pieceLayoutsPageNo:number|null, // Selected page number for both prepared record collections, or null while invalid or animating.
  controlHoverStartedAt?:number,
  controlLayout:ControlLayout // Navigation control rectangles before the page-view offset, plus visibility and hover state.
}

export default BookLayout;