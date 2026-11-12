import Conclusion from "@/game/conclusions/types/Conclusion"

type BookPageBase<Kind extends string> = {
  kind:Kind,
  headingText:string
}

type BookStartPage = BookPageBase<'bookStart'> & {
  title:string,
  author:string,
  description:string
}

type ChapterStartPage = BookPageBase<'chapterStart'> & {
  title:string
}

type ConclusionPage = BookPageBase<'conclusion'> & {
  conclusion:Conclusion
}

type BlankPage = BookPageBase<'blank'> & {
}

type BookPage = BookStartPage | ChapterStartPage | ConclusionPage | BlankPage;

export default BookPage;