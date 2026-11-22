import BookStartPage from './BookStartPage';
import ChapterStartPage from './ChapterStartPage';
import ConclusionPage from './ConclusionPage';
import BlankPage from './BlankPage';
import TallyPage from './TallyPage';
import ChapterEndPage from './ChapterEndPage';

type BookPage = BookStartPage | ChapterStartPage | ConclusionPage | BlankPage | TallyPage | ChapterEndPage;

export default BookPage;