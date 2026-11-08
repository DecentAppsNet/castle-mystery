import Rect, { createDefaultRect } from "@/game/types/Rect"

type BookLayout = {
  canvasWidth:number,
  canvasHeight:number,
  isSinglePageView:boolean,
  rect:Rect
}

export function createDefaultBookLayout():BookLayout {
  return { 
    canvasWidth:0,
    canvasHeight:0, 
    isSinglePageView:false, 
    rect:createDefaultRect() 
  }
}

export default BookLayout;