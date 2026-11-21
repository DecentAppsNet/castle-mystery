import ClozeBlank from '@/game/conclusions/types/ClozeBlank';
import BookPage from './BookPage';

type BookClaimGlint = {
  readonly page:Extract<BookPage, { kind:'conclusion' }>;
  readonly blank:ClozeBlank;
  readonly angle:number;
};

export default BookClaimGlint;