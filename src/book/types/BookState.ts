import BookLayout from "../drawing/types/BookLayout"
import AnimationEndCallback from "./AnimationEndCallback"
import BookPage from "./BookPage"
import Piece from "./Piece"
import PieceDragState from "./PieceDragState"
import PieceSlotLayout from "../drawing/types/PieceSlotLayout"
import PieceSlotTransition from "./PieceSlotTransition"

type BookState = {
  layout:BookLayout|null,
  animationKind:'appear'|'disappear'|'shiftLeft'|'shiftRight'|'flipPrev'|'flipNext'|null
  animationStartMetaTime:number,
  animationDuration:number,
  onAnimationEnd:AnimationEndCallback|null,
  isVisible:boolean,
  pageNo:number,
  pieceStack:Piece[],
  pieceDragState:PieceDragState|null,
  hungryPieceSlot:PieceSlotLayout|null,
  pieceSlotTransitions:PieceSlotTransition[],
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
    pieceDragState:null,
    hungryPieceSlot:null,
    pieceSlotTransitions:[],
    pages:[]
  }
}

export default BookState;