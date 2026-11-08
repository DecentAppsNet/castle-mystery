import Rect from "@/game/types/Rect"

type BookLayout = {
  canvasWidth:number,
  canvasHeight:number,
  isSinglePageView:boolean,
  singlePageViewOffsetX:number,
  rect:Rect
}

export default BookLayout;