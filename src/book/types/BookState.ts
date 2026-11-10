import BookLayout from "../drawing/types/BookLayout"
import AnimationEndCallback from "./AnimationEndCallback"
import BookPage from "./BookPage"

type BookState = {
  layout:BookLayout|null,
  animationKind:'appear'|'disappear'|'shiftLeft'|'shiftRight'|'flipPrev'|'flipNext'|null
  animationStartMetaTime:number,
  animationDuration:number,
  onAnimationEnd:AnimationEndCallback|null,
  isVisible:boolean,
  pageNo:number,
  pages:BookPage[]
}

export function createDefaultBookState():BookState {
  return {
    layout:null,
    animationKind:null,
    animationStartMetaTime:0,
    animationDuration:0,
    onAnimationEnd:null,
    isVisible:false,
    pageNo:1,
    pages:[]
  }
}

export default BookState;