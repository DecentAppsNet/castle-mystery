import BookLayout from "../drawing/types/BookLayout"
import BookPage from "./BookPage"

type BookState = {
  layout:BookLayout|null,
  animationKind:'appear'|'disappear'|null
  animationStartMetaTime:number,
  isVisible:boolean,
  pageNo:number,
  pages:BookPage[]
}

export function createDefaultBookState():BookState {
  return {
    layout:null,
    animationKind:null,
    animationStartMetaTime:0,
    isVisible:false,
    pageNo:1,
    pages:[]
  }
}

export default BookState;