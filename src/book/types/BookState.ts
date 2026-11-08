import BookLayout, { createDefaultBookLayout } from "../drawing/types/BookLayout"

type BookState = {
  layout:BookLayout,
  animationKind:'appear'|'disappear'|null
  animationStartMetaTime:number
}

export function createDefaultBookState():BookState {
  return {
    layout:createDefaultBookLayout(),
    animationKind:null,
    animationStartMetaTime:0
  }
}

export default BookState;