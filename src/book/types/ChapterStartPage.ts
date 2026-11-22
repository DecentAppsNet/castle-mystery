import BookPageBase from './BookPageBase';

type ChapterStartPage = BookPageBase<'chapterStart'> & {
  title:string,
  chapterNo:number,
  description:string
}

export default ChapterStartPage;