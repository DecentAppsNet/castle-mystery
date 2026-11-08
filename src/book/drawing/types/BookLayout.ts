import ControlLayout from "@/canvasControls/types/ControlLayout";
import Rect from "@/game/types/Rect"

type BookLayout = {
  canvasWidth:number,
  canvasHeight:number,
  isSinglePageView:boolean,
  singlePageViewOffsetX:number,
  rect:Rect,
  controlLayout:ControlLayout
}

export default BookLayout;