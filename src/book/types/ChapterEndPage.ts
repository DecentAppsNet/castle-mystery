import Conclusion from '@/game/conclusions/types/Conclusion';
import BookPageBase from './BookPageBase';

type ChapterEndPage = BookPageBase<'chapterEnd'> & {
  winSynopsis:string, 
  conclusions:readonly Readonly<Conclusion>[];
}

export default ChapterEndPage;