import Conclusion from "@/game/conclusions/types/Conclusion"
import Piece from "./Piece"

type BookPageBase<Kind extends string> = {
  kind:Kind,
  headingText:string
}

type BookStartPage = BookPageBase<'bookStart'> & {
  title:string,
  subtitle:string|null
  author:string,
}

type ChapterStartPage = BookPageBase<'chapterStart'> & {
  title:string,
  chapterNo:number,
  description:string
}

type ConclusionPage = BookPageBase<'conclusion'> & {
  conclusion:Conclusion,
  pieces:Piece[]
}

type BlankPage = BookPageBase<'blank'> & {
}

type BookPage = BookStartPage | ChapterStartPage | ConclusionPage | BlankPage;

export default BookPage;