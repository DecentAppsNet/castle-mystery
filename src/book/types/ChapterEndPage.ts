import BookPageBase from './BookPageBase';

type ChapterEndPage = BookPageBase<'chapterEnd'> & {
  winSynopsis:string
}

export default ChapterEndPage;