import BookLayout from "../drawing/types/BookLayout"
import AnimationEndCallback from "./AnimationEndCallback"
import BookPage from "./BookPage"
import Piece from "./Piece"

type BookState = {
  layout:BookLayout|null,
  animationKind:'appear'|'disappear'|'shiftLeft'|'shiftRight'|'flipPrev'|'flipNext'|null
  animationStartMetaTime:number,
  animationDuration:number,
  onAnimationEnd:AnimationEndCallback|null,
  isVisible:boolean,
  pageNo:number,
  pieceStack:Piece[],
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
    pieceStack:[],
    pages:[]
  }
}

export default BookState;