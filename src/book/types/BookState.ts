import BookLayout from "../drawing/types/BookLayout"
import BookPage from "./BookPage"

type AnimationEndCallback = (metaTime:number, isAborted:boolean, bookState:BookState) => void;

type BookState = {
  layout:BookLayout|null,
  animationKind:'appear'|'disappear'|null
  animationStartMetaTime:number,
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
    onAnimationEnd:null,
    isVisible:false,
    pageNo:1,
    pages:[]
  }
}

export default BookState;