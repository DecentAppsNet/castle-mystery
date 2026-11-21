import Conclusion from "@/game/conclusions/types/Conclusion"
import AnswerSetIdToPieceStyleNoMap from './AnswerSetIdToPieceStyleNoMap';

type BookPageBase<Kind extends string> = {
  kind:Kind,
  headingText:string,
  chapterNo:number
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
  readonly answerSetIdToPieceStyleNoMap:AnswerSetIdToPieceStyleNoMap
}

type TallyPage = BookPageBase<'tally'> & {
  conclusions:Conclusion[]
}

type BlankPage = BookPageBase<'blank'> & { }

type BookPage = BookStartPage | ChapterStartPage | ConclusionPage | BlankPage | TallyPage;

export default BookPage;