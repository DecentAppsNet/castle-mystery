import BookPageBase from './BookPageBase';

type ChapterStartPage = BookPageBase<'chapterStart'> & {
  readonly levelUrl:string,
  title:string,
  chapterNo:number,
  description:string
}

export default ChapterStartPage;